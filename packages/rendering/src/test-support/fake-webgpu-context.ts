import type {
  IGPUBindGroup,
  IGPUBindGroupLayout,
  IGPUBuffer,
  IGPUCanvasContext,
  IGPUCommandBuffer,
  IGPUCommandEncoder,
  IGPUDevice,
  IGPURenderPassEncoder,
  IGPURenderPipeline,
  IGPUShaderModule,
  IGPUTextureView,
} from "../webgpu-backend";

export type FakeGPUCall =
  | { op: "writeBuffer"; byteOffset: number; data: Float32Array }
  | { op: "submit" }
  | { op: "draw"; vertexCount: number };

/**
 * Minimal, always-succeeding fake of the WebGPU device/canvas-context pair
 * — no real GPU exists in this package's Node test environment. Exercises
 * the backend's real call sequence (pipeline creation, per-node uniform
 * writes, one draw call per node) without a real GPU compiling WGSL.
 */
export class FakeWebGPUDevice implements IGPUDevice {
  readonly calls: FakeGPUCall[] = [];

  readonly queue = {
    writeBuffer: (_buffer: IGPUBuffer, byteOffset: number, data: Float32Array): void => {
      this.calls.push({ op: "writeBuffer", byteOffset, data: new Float32Array(data) });
    },
    submit: (): void => {
      this.calls.push({ op: "submit" });
    },
  };

  createShaderModule(): IGPUShaderModule {
    return {};
  }

  createBuffer(): IGPUBuffer {
    return {};
  }

  createRenderPipeline(): IGPURenderPipeline {
    return { getBindGroupLayout: (): IGPUBindGroupLayout => ({}) };
  }

  createBindGroup(): IGPUBindGroup {
    return {};
  }

  createCommandEncoder(): IGPUCommandEncoder {
    const calls = this.calls;
    const pass: IGPURenderPassEncoder = {
      setPipeline: (): void => {},
      setVertexBuffer: (): void => {},
      setBindGroup: (): void => {},
      draw: (vertexCount: number): void => {
        calls.push({ op: "draw", vertexCount });
      },
      end: (): void => {},
    };
    return {
      beginRenderPass: (): IGPURenderPassEncoder => pass,
      finish: (): IGPUCommandBuffer => ({}),
    };
  }
}

export class FakeGPUCanvasContext implements IGPUCanvasContext {
  configure(): void {}

  getCurrentTexture(): { createView(): IGPUTextureView } {
    return { createView: (): IGPUTextureView => ({}) };
  }
}
