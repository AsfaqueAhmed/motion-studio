import { RenderBackend } from "@motion-studio/shared";
import { placeholderColor } from "./placeholder-color";
import type { IRenderBackend, IRenderTargetSize } from "./render-backend";
import { sortRenderQueue } from "./render-queue";
import type { ISceneGraph, ISceneGraphNode } from "./scene-graph";

export type IGLShader = object;
export type IGLProgram = object;
export type IGLBuffer = object;
export type IGLUniformLocation = object;

/**
 * The subset of `WebGL2RenderingContext` this backend calls, hand-rolled
 * (rather than the full lib.dom interface) so tests can inject a fake
 * without a real GPU — same pattern as `ICanvas2DContext`. GL constants
 * (e.g. `VERTEX_SHADER`) are read off the context itself, exactly like
 * real WebGL2 code does (`gl.createShader(gl.VERTEX_SHADER)`), so a real
 * `WebGL2RenderingContext` satisfies this interface structurally.
 */
export interface IWebGL2Context {
  readonly VERTEX_SHADER: number;
  readonly FRAGMENT_SHADER: number;
  readonly COMPILE_STATUS: number;
  readonly LINK_STATUS: number;
  readonly ARRAY_BUFFER: number;
  readonly STATIC_DRAW: number;
  readonly TRIANGLE_STRIP: number;
  readonly COLOR_BUFFER_BIT: number;
  readonly BLEND: number;
  readonly SRC_ALPHA: number;
  readonly ONE_MINUS_SRC_ALPHA: number;
  readonly FLOAT: number;

  createShader(type: number): IGLShader | null;
  shaderSource(shader: IGLShader, source: string): void;
  compileShader(shader: IGLShader): void;
  getShaderParameter(shader: IGLShader, pname: number): unknown;
  getShaderInfoLog(shader: IGLShader): string | null;
  deleteShader(shader: IGLShader | null): void;

  createProgram(): IGLProgram | null;
  attachShader(program: IGLProgram, shader: IGLShader): void;
  linkProgram(program: IGLProgram): void;
  getProgramParameter(program: IGLProgram, pname: number): unknown;
  getProgramInfoLog(program: IGLProgram): string | null;
  useProgram(program: IGLProgram | null): void;
  deleteProgram(program: IGLProgram | null): void;

  createBuffer(): IGLBuffer | null;
  bindBuffer(target: number, buffer: IGLBuffer | null): void;
  bufferData(target: number, data: Float32Array, usage: number): void;
  deleteBuffer(buffer: IGLBuffer | null): void;

  getAttribLocation(program: IGLProgram, name: string): number;
  enableVertexAttribArray(index: number): void;
  vertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number,
  ): void;

  getUniformLocation(program: IGLProgram, name: string): IGLUniformLocation | null;
  uniform1f(location: IGLUniformLocation | null, x: number): void;
  uniform2f(location: IGLUniformLocation | null, x: number, y: number): void;
  uniform4f(location: IGLUniformLocation | null, x: number, y: number, z: number, w: number): void;

  viewport(x: number, y: number, width: number, height: number): void;
  clearColor(r: number, g: number, b: number, a: number): void;
  clear(mask: number): void;
  enable(cap: number): void;
  blendFunc(sfactor: number, dfactor: number): void;
  drawArrays(mode: number, first: number, count: number): void;
}

export interface IWebGL2BackendDependencies {
  getContext(): IWebGL2Context;
}

/**
 * Vertex shader: maps a unit quad (0..1) into `bounds`, applies the layer's
 * anchor/scale/rotation/translate (matching `ITransform2D`'s convention —
 * see `transform.ts`), then projects world space into clip space.
 */
const VERTEX_SHADER_SOURCE = `#version 300 es
layout(location = 0) in vec2 a_unitQuad;
uniform vec2 u_canvasSize;
uniform vec2 u_translate;
uniform vec2 u_scale;
uniform float u_rotation;
uniform vec2 u_boundsOrigin;
uniform vec2 u_boundsSize;

void main() {
  vec2 local = u_boundsOrigin + a_unitQuad * u_boundsSize;
  vec2 scaled = local * u_scale;
  float c = cos(u_rotation);
  float s = sin(u_rotation);
  vec2 rotated = vec2(scaled.x * c - scaled.y * s, scaled.x * s + scaled.y * c);
  vec2 world = rotated + u_translate;
  vec2 ndc = (world / u_canvasSize) * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}
`;

/** Fragment shader: flat color fill — see `placeholder-color.ts` for why content isn't real pixels yet. */
const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 fragColor;

void main() {
  fragColor = u_color;
}
`;

const UNIT_QUAD = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);

/**
 * WebGL2 backend — the fallback rung between WebGPU and Canvas2D
 * (`05-rendering-engine/webgl.md`). GLSL is authored here independently of
 * WebGPU's WGSL (`webgpu-backend.ts`) per ADR-004/shader-system.md: the two
 * are never auto-shared.
 */
export class WebGL2RenderBackend implements IRenderBackend {
  readonly kind = RenderBackend.WebGL2;

  private readonly getContext: () => IWebGL2Context;
  private gl: IWebGL2Context | null = null;
  private program: IGLProgram | null = null;
  private quadBuffer: IGLBuffer | null = null;
  private width = 0;
  private height = 0;

  constructor(dependencies: IWebGL2BackendDependencies) {
    this.getContext = () => dependencies.getContext();
  }

  init(target: IRenderTargetSize): void {
    this.width = target.width;
    this.height = target.height;
    const gl = this.getContext();
    this.gl = gl;

    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    this.program = this.linkProgram(gl, vertexShader, fragmentShader);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, UNIT_QUAD, gl.STATIC_DRAW);

    gl.viewport(0, 0, this.width, this.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  drawFrame(sceneGraph: ISceneGraph): void {
    const gl = this.requireGl();
    const program = this.requireProgram();

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const positionLocation = gl.getAttribLocation(program, "a_unitQuad");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    this.setUniform2f(gl, program, "u_canvasSize", this.width, this.height);

    for (const node of sortRenderQueue(sceneGraph.nodes)) {
      this.drawNode(gl, program, node);
    }
  }

  dispose(): void {
    const gl = this.gl;
    if (gl) {
      gl.deleteProgram(this.program);
      gl.deleteBuffer(this.quadBuffer);
    }
    this.gl = null;
    this.program = null;
    this.quadBuffer = null;
  }

  private drawNode(gl: IWebGL2Context, program: IGLProgram, node: ISceneGraphNode): void {
    const { r, g, b } = placeholderColor(node.layerId);
    const { transform, bounds } = node;

    this.setUniform2f(gl, program, "u_translate", transform.x, transform.y);
    this.setUniform2f(gl, program, "u_scale", transform.scaleX, transform.scaleY);
    this.setUniform1f(gl, program, "u_rotation", transform.rotation);
    this.setUniform2f(
      gl,
      program,
      "u_boundsOrigin",
      bounds.x - transform.anchorX,
      bounds.y - transform.anchorY,
    );
    this.setUniform2f(gl, program, "u_boundsSize", bounds.width, bounds.height);
    this.setUniform4f(gl, program, "u_color", r / 255, g / 255, b / 255, node.opacity);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private setUniform1f(gl: IWebGL2Context, program: IGLProgram, name: string, x: number): void {
    gl.uniform1f(gl.getUniformLocation(program, name), x);
  }

  private setUniform2f(
    gl: IWebGL2Context,
    program: IGLProgram,
    name: string,
    x: number,
    y: number,
  ): void {
    gl.uniform2f(gl.getUniformLocation(program, name), x, y);
  }

  private setUniform4f(
    gl: IWebGL2Context,
    program: IGLProgram,
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
  ): void {
    gl.uniform4f(gl.getUniformLocation(program, name), x, y, z, w);
  }

  private compileShader(gl: IWebGL2Context, type: number, source: string): IGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("WebGL2RenderBackend: createShader failed");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`WebGL2RenderBackend: shader compile failed: ${log ?? "unknown error"}`);
    }
    return shader;
  }

  private linkProgram(
    gl: IWebGL2Context,
    vertexShader: IGLShader,
    fragmentShader: IGLShader,
  ): IGLProgram {
    const program = gl.createProgram();
    if (!program) {
      throw new Error("WebGL2RenderBackend: createProgram failed");
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`WebGL2RenderBackend: program link failed: ${log ?? "unknown error"}`);
    }
    return program;
  }

  private requireGl(): IWebGL2Context {
    if (!this.gl) {
      throw new Error("WebGL2RenderBackend: drawFrame called before init()");
    }
    return this.gl;
  }

  private requireProgram(): IGLProgram {
    if (!this.program) {
      throw new Error("WebGL2RenderBackend: drawFrame called before init()");
    }
    return this.program;
  }
}
