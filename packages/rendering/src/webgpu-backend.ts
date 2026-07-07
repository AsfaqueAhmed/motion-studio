import { RenderBackend } from "@motion-studio/shared";
import { placeholderColor } from "./placeholder-color";
import type { IRenderBackend, IRenderTargetSize } from "./render-backend";
import { sortRenderQueue } from "./render-queue";
import type { ISceneGraph, ISceneGraphNode } from "./scene-graph";

export type IGPUShaderModule = object;
export type IGPUBuffer = object;
export type IGPUBindGroupLayout = object;
export type IGPUBindGroup = object;
export type IGPUTextureView = object;
export type IGPUCommandBuffer = object;

export interface IGPURenderPipeline {
  getBindGroupLayout(index: number): IGPUBindGroupLayout;
}

export interface IGPURenderPassEncoder {
  setPipeline(pipeline: IGPURenderPipeline): void;
  setVertexBuffer(slot: number, buffer: IGPUBuffer): void;
  setBindGroup(index: number, bindGroup: IGPUBindGroup): void;
  draw(vertexCount: number): void;
  end(): void;
}

export interface IGPUCommandEncoder {
  beginRenderPass(descriptor: {
    colorAttachments: ReadonlyArray<{
      view: IGPUTextureView;
      clearValue: { r: number; g: number; b: number; a: number };
      loadOp: "clear" | "load";
      storeOp: "store" | "discard";
    }>;
  }): IGPURenderPassEncoder;
  finish(): IGPUCommandBuffer;
}

export interface IGPUQueue {
  writeBuffer(buffer: IGPUBuffer, bufferOffset: number, data: Float32Array): void;
  submit(commandBuffers: readonly IGPUCommandBuffer[]): void;
}

export interface IGPUCanvasContext {
  configure(config: { device: IGPUDevice; format: string }): void;
  getCurrentTexture(): { createView(): IGPUTextureView };
}

/**
 * The subset of `GPUDevice` this backend calls — hand-rolled (there is no
 * `@webgpu/types` dependency here) so tests can inject a fake without a
 * real GPU, same pattern as `IWebGL2Context`/`ICanvas2DContext`.
 */
export interface IGPUDevice {
  readonly queue: IGPUQueue;
  createShaderModule(descriptor: { code: string }): IGPUShaderModule;
  createBuffer(descriptor: { size: number; usage: number }): IGPUBuffer;
  createRenderPipeline(descriptor: {
    layout: "auto";
    vertex: {
      module: IGPUShaderModule;
      entryPoint: string;
      buffers: ReadonlyArray<{
        arrayStride: number;
        attributes: ReadonlyArray<{ shaderLocation: number; offset: number; format: string }>;
      }>;
    };
    fragment: {
      module: IGPUShaderModule;
      entryPoint: string;
      targets: ReadonlyArray<{ format: string }>;
    };
    primitive: { topology: string };
  }): IGPURenderPipeline;
  createBindGroup(descriptor: {
    layout: IGPUBindGroupLayout;
    entries: ReadonlyArray<{ binding: number; resource: { buffer: IGPUBuffer } }>;
  }): IGPUBindGroup;
  createCommandEncoder(): IGPUCommandEncoder;
}

export interface IWebGPUBackendDependencies {
  getDevice(): IGPUDevice;
  getCanvasContext(): IGPUCanvasContext;
  /** Defaults to `"bgra8unorm"`, the platform-preferred swap chain format on most browsers. */
  canvasFormat?: string;
}

// WebGPU spec-fixed GPUBufferUsage bit flags — not exposed on GPUDevice itself.
const GPU_BUFFER_USAGE_VERTEX = 0x20;
const GPU_BUFFER_USAGE_UNIFORM = 0x40;
const GPU_BUFFER_USAGE_COPY_DST = 0x8;

const UNIFORM_BUFFER_SIZE_BYTES = 64; // 16 floats — see struct layout in WGSL_SHADER_SOURCE below.
const UNIFORM_FLOAT_COUNT = UNIFORM_BUFFER_SIZE_BYTES / 4;

const UNIT_QUAD = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);

/**
 * Single WGSL module (vertex + fragment) mirroring `webgl2-backend.ts`'s
 * GLSL topology exactly, but authored independently per ADR-004/
 * shader-system.md: WGSL and GLSL are never auto-shared. Struct field
 * order/alignment matches the 16-float `Float32Array` written per node in
 * `writeUniforms` below (`vec2`/`f32` @ 8/4-byte alignment, `vec4` @
 * 16-byte alignment per the WGSL spec).
 */
const WGSL_SHADER_SOURCE = `
struct Uniforms {
  canvasSize: vec2<f32>,
  translate: vec2<f32>,
  scale: vec2<f32>,
  rotation: f32,
  _pad0: f32,
  boundsOrigin: vec2<f32>,
  boundsSize: vec2<f32>,
  color: vec4<f32>,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vs_main(@location(0) unitQuad: vec2<f32>) -> @builtin(position) vec4<f32> {
  let local = u.boundsOrigin + unitQuad * u.boundsSize;
  let scaled = local * u.scale;
  let c = cos(u.rotation);
  let s = sin(u.rotation);
  let rotated = vec2<f32>(scaled.x * c - scaled.y * s, scaled.x * s + scaled.y * c);
  let world = rotated + u.translate;
  let ndc = (world / u.canvasSize) * 2.0 - vec2<f32>(1.0, 1.0);
  return vec4<f32>(ndc.x, -ndc.y, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
  return u.color;
}
`;

/** WebGPU backend — the primary rung (`05-rendering-engine/webgpu.md`), confirmed solid 2026 browser support. */
export class WebGPURenderBackend implements IRenderBackend {
  readonly kind = RenderBackend.WebGPU;

  private readonly dependencies: IWebGPUBackendDependencies;
  private device: IGPUDevice | null = null;
  private canvasContext: IGPUCanvasContext | null = null;
  private pipeline: IGPURenderPipeline | null = null;
  private vertexBuffer: IGPUBuffer | null = null;
  private uniformBuffer: IGPUBuffer | null = null;
  private bindGroup: IGPUBindGroup | null = null;
  private width = 0;
  private height = 0;

  constructor(dependencies: IWebGPUBackendDependencies) {
    this.dependencies = dependencies;
  }

  init(target: IRenderTargetSize): void {
    this.width = target.width;
    this.height = target.height;

    const device = this.dependencies.getDevice();
    const canvasContext = this.dependencies.getCanvasContext();
    const format = this.dependencies.canvasFormat ?? "bgra8unorm";
    canvasContext.configure({ device, format });

    const shaderModule = device.createShaderModule({ code: WGSL_SHADER_SOURCE });
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          { arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] },
        ],
      },
      fragment: { module: shaderModule, entryPoint: "fs_main", targets: [{ format }] },
      primitive: { topology: "triangle-strip" },
    });

    const vertexBuffer = device.createBuffer({
      size: UNIT_QUAD.byteLength,
      usage: GPU_BUFFER_USAGE_VERTEX | GPU_BUFFER_USAGE_COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, UNIT_QUAD);

    const uniformBuffer = device.createBuffer({
      size: UNIFORM_BUFFER_SIZE_BYTES,
      usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
    });
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    this.device = device;
    this.canvasContext = canvasContext;
    this.pipeline = pipeline;
    this.vertexBuffer = vertexBuffer;
    this.uniformBuffer = uniformBuffer;
    this.bindGroup = bindGroup;
  }

  drawFrame(sceneGraph: ISceneGraph): void {
    const device = this.requireDevice();
    const canvasContext = this.requireCanvasContext();
    const pipeline = this.requirePipeline();
    const encoder = device.createCommandEncoder();
    const view = canvasContext.getCurrentTexture().createView();

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, this.vertexBuffer as IGPUBuffer);
    pass.setBindGroup(0, this.bindGroup as IGPUBindGroup);

    for (const node of sortRenderQueue(sceneGraph.nodes)) {
      this.writeUniforms(device, node);
      pass.draw(4);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    this.device = null;
    this.canvasContext = null;
    this.pipeline = null;
    this.vertexBuffer = null;
    this.uniformBuffer = null;
    this.bindGroup = null;
  }

  private writeUniforms(device: IGPUDevice, node: ISceneGraphNode): void {
    const { r, g, b } = placeholderColor(node.layerId);
    const { transform, bounds } = node;
    const data = new Float32Array(UNIFORM_FLOAT_COUNT);
    data[0] = this.width;
    data[1] = this.height;
    data[2] = transform.x;
    data[3] = transform.y;
    data[4] = transform.scaleX;
    data[5] = transform.scaleY;
    data[6] = transform.rotation;
    data[7] = 0; // _pad0
    data[8] = bounds.x - transform.anchorX;
    data[9] = bounds.y - transform.anchorY;
    data[10] = bounds.width;
    data[11] = bounds.height;
    data[12] = r / 255;
    data[13] = g / 255;
    data[14] = b / 255;
    data[15] = node.opacity;
    device.queue.writeBuffer(this.uniformBuffer as IGPUBuffer, 0, data);
  }

  private requireDevice(): IGPUDevice {
    if (!this.device) {
      throw new Error("WebGPURenderBackend: drawFrame called before init()");
    }
    return this.device;
  }

  private requireCanvasContext(): IGPUCanvasContext {
    if (!this.canvasContext) {
      throw new Error("WebGPURenderBackend: drawFrame called before init()");
    }
    return this.canvasContext;
  }

  private requirePipeline(): IGPURenderPipeline {
    if (!this.pipeline) {
      throw new Error("WebGPURenderBackend: drawFrame called before init()");
    }
    return this.pipeline;
  }
}
