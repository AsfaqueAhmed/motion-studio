import type { AssetId } from "@motion-studio/shared";
import { RenderBackend } from "@motion-studio/shared";
import { placeholderColor } from "./placeholder-color";
import type { IRenderBackend, IRenderTargetSize } from "./render-backend";
import { sortRenderQueue } from "./render-queue";
import type { ISceneGraph, ISceneGraphNode } from "./scene-graph";
import type { ITextureSource } from "./texture-source";

export type IGLShader = object;
export type IGLProgram = object;
export type IGLBuffer = object;
export type IGLUniformLocation = object;
export type IGLTexture = object;

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
  readonly TEXTURE_2D: number;
  readonly TEXTURE0: number;
  readonly RGBA: number;
  readonly UNSIGNED_BYTE: number;
  readonly LINEAR: number;
  readonly CLAMP_TO_EDGE: number;
  readonly TEXTURE_MIN_FILTER: number;
  readonly TEXTURE_MAG_FILTER: number;
  readonly TEXTURE_WRAP_S: number;
  readonly TEXTURE_WRAP_T: number;

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
  uniform1i(location: IGLUniformLocation | null, x: number): void;
  uniform2f(location: IGLUniformLocation | null, x: number, y: number): void;
  uniform4f(location: IGLUniformLocation | null, x: number, y: number, z: number, w: number): void;

  viewport(x: number, y: number, width: number, height: number): void;
  clearColor(r: number, g: number, b: number, a: number): void;
  clear(mask: number): void;
  enable(cap: number): void;
  blendFunc(sfactor: number, dfactor: number): void;
  drawArrays(mode: number, first: number, count: number): void;

  createTexture(): IGLTexture | null;
  bindTexture(target: number, texture: IGLTexture | null): void;
  texParameteri(target: number, pname: number, param: number): void;
  texImage2D(
    target: number,
    level: number,
    internalformat: number,
    format: number,
    type: number,
    source: CanvasImageSource,
  ): void;
  activeTexture(unit: number): void;
  deleteTexture(texture: IGLTexture | null): void;
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

/** Fragment shader: flat color fill — used when a node has no resolved texture (`placeholder-color.ts`). */
const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 fragColor;

void main() {
  fragColor = u_color;
}
`;

/**
 * Textured variant of `VERTEX_SHADER_SOURCE` — identical transform math,
 * plus a `v_uv` varying derived directly from the unit quad (no second
 * vertex buffer needed, no flip). `texImage2D` without
 * `UNPACK_FLIP_Y_WEBGL` copies the source's rows in order, so texture row 0
 * (`v=0`) is already the image's own top row; `a_unitQuad.y=0` is already
 * this quad's top edge (`VERTEX_SHADER_SOURCE`'s `-ndc.y` puts the smallest
 * world-space Y at the top of clip space) — the two top edges already
 * agree, so flipping here would introduce a mismatch, not fix one.
 */
const VERTEX_SHADER_SOURCE_TEXTURED = `#version 300 es
layout(location = 0) in vec2 a_unitQuad;
uniform vec2 u_canvasSize;
uniform vec2 u_translate;
uniform vec2 u_scale;
uniform float u_rotation;
uniform vec2 u_boundsOrigin;
uniform vec2 u_boundsSize;
out vec2 v_uv;

void main() {
  vec2 local = u_boundsOrigin + a_unitQuad * u_boundsSize;
  vec2 scaled = local * u_scale;
  float c = cos(u_rotation);
  float s = sin(u_rotation);
  vec2 rotated = vec2(scaled.x * c - scaled.y * s, scaled.x * s + scaled.y * c);
  vec2 world = rotated + u_translate;
  vec2 ndc = (world / u_canvasSize) * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  v_uv = a_unitQuad;
}
`;

/** Fragment shader: samples the resolved image/video texture, modulated by the layer's opacity. */
const FRAGMENT_SHADER_SOURCE_TEXTURED = `#version 300 es
precision mediump float;
uniform sampler2D u_texture;
uniform float u_opacity;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 texColor = texture(u_texture, v_uv);
  fragColor = vec4(texColor.rgb, texColor.a * u_opacity);
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
  private texturedProgram: IGLProgram | null = null;
  private quadBuffer: IGLBuffer | null = null;
  private width = 0;
  private height = 0;
  private readonly textureCache = new Map<
    AssetId,
    { handle: IGLTexture; uploaded: boolean; isLive: boolean }
  >();

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

    const texturedVertexShader = this.compileShader(
      gl,
      gl.VERTEX_SHADER,
      VERTEX_SHADER_SOURCE_TEXTURED,
    );
    const texturedFragmentShader = this.compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      FRAGMENT_SHADER_SOURCE_TEXTURED,
    );
    this.texturedProgram = this.linkProgram(gl, texturedVertexShader, texturedFragmentShader);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, UNIT_QUAD, gl.STATIC_DRAW);

    gl.viewport(0, 0, this.width, this.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  drawFrame(sceneGraph: ISceneGraph): void {
    const gl = this.requireGl();

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // `layout(location = 0)` pins `a_unitQuad` to the same slot in both
    // programs, so the vertex buffer binding is shared and only needs
    // setting up once per frame, independent of which program draws a node.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    for (const node of sortRenderQueue(sceneGraph.nodes)) {
      this.drawNode(gl, node);
    }
  }

  dispose(): void {
    const gl = this.gl;
    if (gl) {
      gl.deleteProgram(this.program);
      gl.deleteProgram(this.texturedProgram);
      gl.deleteBuffer(this.quadBuffer);
      for (const entry of this.textureCache.values()) {
        gl.deleteTexture(entry.handle);
      }
    }
    this.gl = null;
    this.program = null;
    this.texturedProgram = null;
    this.quadBuffer = null;
    this.textureCache.clear();
  }

  private drawNode(gl: IWebGL2Context, node: ISceneGraphNode): void {
    const texture = node.texture?.kind === "image-source" ? node.texture : undefined;
    if (texture && node.assetId !== undefined) {
      this.drawTexturedNode(gl, node, node.assetId, texture);
    } else {
      this.drawFlatNode(gl, node);
    }
  }

  private drawFlatNode(gl: IWebGL2Context, node: ISceneGraphNode): void {
    const program = this.requireProgram();
    const { r, g, b } = placeholderColor(node.layerId);
    const { transform, bounds } = node;

    gl.useProgram(program);
    this.setUniform2f(gl, program, "u_canvasSize", this.width, this.height);
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

  private drawTexturedNode(
    gl: IWebGL2Context,
    node: ISceneGraphNode,
    assetId: AssetId,
    texture: Extract<ITextureSource, { kind: "image-source" }>,
  ): void {
    const program = this.requireTexturedProgram();
    const { transform, bounds } = node;

    gl.useProgram(program);
    this.setUniform2f(gl, program, "u_canvasSize", this.width, this.height);
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
    this.setUniform1f(gl, program, "u_opacity", node.opacity);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.getOrCreateTexture(gl, assetId, texture));
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Uploads once for a static image, re-uploads every call for a live video frame — see `ITextureSource.isLive`. */
  private getOrCreateTexture(
    gl: IWebGL2Context,
    assetId: AssetId,
    texture: Extract<ITextureSource, { kind: "image-source" }>,
  ): IGLTexture {
    let entry = this.textureCache.get(assetId);
    if (!entry) {
      const handle = gl.createTexture();
      if (!handle) {
        throw new Error("WebGL2RenderBackend: createTexture failed");
      }
      entry = { handle, uploaded: false, isLive: texture.isLive };
      this.textureCache.set(assetId, entry);
    }
    gl.bindTexture(gl.TEXTURE_2D, entry.handle);
    if (!entry.uploaded || entry.isLive) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.source);
      entry.uploaded = true;
    }
    return entry.handle;
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

  private requireTexturedProgram(): IGLProgram {
    if (!this.texturedProgram) {
      throw new Error("WebGL2RenderBackend: drawFrame called before init()");
    }
    return this.texturedProgram;
  }
}
