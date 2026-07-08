import type {
  IGLBuffer,
  IGLProgram,
  IGLShader,
  IGLTexture,
  IGLUniformLocation,
  IWebGL2Context,
} from "../webgl2-backend";

interface FakeShader extends IGLShader {
  type: number;
  source: string;
}

interface FakeProgram extends IGLProgram {
  shaders: FakeShader[];
}

interface FakeUniformLocation extends IGLUniformLocation {
  name: string;
}

export type FakeGLCall =
  | { op: "clear" }
  | { op: "useProgram" }
  | { op: "drawArrays"; mode: number; first: number; count: number }
  | { op: "uniform1f"; name: string; x: number }
  | { op: "uniform1i"; name: string; x: number }
  | { op: "uniform2f"; name: string; x: number; y: number }
  | { op: "uniform4f"; name: string; x: number; y: number; z: number; w: number }
  | { op: "texImage2D"; source: CanvasImageSource };

/**
 * Minimal, always-succeeding fake of `IWebGL2Context` — no real GPU exists
 * in this package's Node test environment. Compiles/links "succeed"
 * unconditionally so tests exercise the backend's call sequence, not a
 * real GLSL compiler.
 */
export class FakeWebGL2Context implements IWebGL2Context {
  readonly VERTEX_SHADER = 35633;
  readonly FRAGMENT_SHADER = 35632;
  readonly COMPILE_STATUS = 35713;
  readonly LINK_STATUS = 35714;
  readonly ARRAY_BUFFER = 34962;
  readonly STATIC_DRAW = 35044;
  readonly TRIANGLE_STRIP = 5;
  readonly COLOR_BUFFER_BIT = 16384;
  readonly BLEND = 3042;
  readonly SRC_ALPHA = 770;
  readonly ONE_MINUS_SRC_ALPHA = 771;
  readonly FLOAT = 5126;
  readonly TEXTURE_2D = 3553;
  readonly TEXTURE0 = 33984;
  readonly RGBA = 6408;
  readonly UNSIGNED_BYTE = 5121;
  readonly LINEAR = 9729;
  readonly CLAMP_TO_EDGE = 33071;
  readonly TEXTURE_MIN_FILTER = 10241;
  readonly TEXTURE_MAG_FILTER = 10240;
  readonly TEXTURE_WRAP_S = 10242;
  readonly TEXTURE_WRAP_T = 10243;

  readonly calls: FakeGLCall[] = [];

  createShader(type: number): IGLShader {
    return { type, source: "" };
  }

  shaderSource(shader: IGLShader, source: string): void {
    (shader as FakeShader).source = source;
  }

  compileShader(): void {
    // always "succeeds" — no real GLSL compiler in Node
  }

  getShaderParameter(_shader: IGLShader, pname: number): unknown {
    return pname === this.COMPILE_STATUS ? true : null;
  }

  getShaderInfoLog(): string | null {
    return null;
  }

  deleteShader(): void {}

  createProgram(): IGLProgram {
    return { shaders: [] };
  }

  attachShader(program: IGLProgram, shader: IGLShader): void {
    (program as FakeProgram).shaders.push(shader as FakeShader);
  }

  linkProgram(): void {
    // always "succeeds"
  }

  getProgramParameter(_program: IGLProgram, pname: number): unknown {
    return pname === this.LINK_STATUS ? true : null;
  }

  getProgramInfoLog(): string | null {
    return null;
  }

  useProgram(program: IGLProgram | null): void {
    if (program) {
      this.calls.push({ op: "useProgram" });
    }
  }

  deleteProgram(): void {}

  createBuffer(): IGLBuffer {
    return {};
  }

  bindBuffer(): void {}

  bufferData(): void {}

  deleteBuffer(): void {}

  getAttribLocation(): number {
    return 0;
  }

  enableVertexAttribArray(): void {}

  vertexAttribPointer(): void {}

  getUniformLocation(_program: IGLProgram, name: string): IGLUniformLocation {
    return { name } satisfies FakeUniformLocation;
  }

  uniform1f(location: IGLUniformLocation | null, x: number): void {
    this.calls.push({ op: "uniform1f", name: (location as FakeUniformLocation).name, x });
  }

  uniform1i(location: IGLUniformLocation | null, x: number): void {
    this.calls.push({ op: "uniform1i", name: (location as FakeUniformLocation).name, x });
  }

  uniform2f(location: IGLUniformLocation | null, x: number, y: number): void {
    this.calls.push({ op: "uniform2f", name: (location as FakeUniformLocation).name, x, y });
  }

  uniform4f(location: IGLUniformLocation | null, x: number, y: number, z: number, w: number): void {
    this.calls.push({ op: "uniform4f", name: (location as FakeUniformLocation).name, x, y, z, w });
  }

  viewport(): void {}

  clearColor(): void {}

  clear(): void {
    this.calls.push({ op: "clear" });
  }

  enable(): void {}

  blendFunc(): void {}

  drawArrays(mode: number, first: number, count: number): void {
    this.calls.push({ op: "drawArrays", mode, first, count });
  }

  createTexture(): IGLTexture {
    return {};
  }

  bindTexture(): void {}

  texParameteri(): void {}

  texImage2D(
    _target: number,
    _level: number,
    _internalformat: number,
    _format: number,
    _type: number,
    source: CanvasImageSource,
  ): void {
    this.calls.push({ op: "texImage2D", source });
  }

  activeTexture(): void {}

  deleteTexture(): void {}
}
