import type { ICanvas2DContext } from "../canvas2d-backend";

export type FakeCanvas2DCall =
  | { op: "save" | "restore" }
  | { op: "translate"; x: number; y: number }
  | { op: "rotate"; radians: number }
  | { op: "scale"; x: number; y: number }
  | { op: "clearRect" | "fillRect"; x: number; y: number; width: number; height: number }
  | {
      op: "drawImage";
      image: CanvasImageSource;
      x: number;
      y: number;
      width: number;
      height: number;
    };

/** Records every call instead of touching a real `<canvas>` — see canvas2d-backend.ts docstring. */
export class FakeCanvas2DContext implements ICanvas2DContext {
  readonly calls: FakeCanvas2DCall[] = [];
  globalAlpha = 1;
  fillStyle = "";

  save(): void {
    this.calls.push({ op: "save" });
  }

  restore(): void {
    this.calls.push({ op: "restore" });
  }

  translate(x: number, y: number): void {
    this.calls.push({ op: "translate", x, y });
  }

  rotate(radians: number): void {
    this.calls.push({ op: "rotate", radians });
  }

  scale(x: number, y: number): void {
    this.calls.push({ op: "scale", x, y });
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.calls.push({ op: "clearRect", x, y, width, height });
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push({ op: "fillRect", x, y, width, height });
  }

  drawImage(image: CanvasImageSource, x: number, y: number, width: number, height: number): void {
    this.calls.push({ op: "drawImage", image, x, y, width, height });
  }
}
