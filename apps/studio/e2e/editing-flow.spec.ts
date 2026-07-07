import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * PLAN.md 16.3's "Import clip → trim → move → undo → redo → export" and
 * "Text layer add → edit → style → export" flows, scoped down to what
 * Phase 15's Editor UI actually supports today (confirmed by loading the
 * running app, not by re-reading PLAN.md):
 *
 * - No Trim UI exists anywhere (`TrimTrackItemCommand` is unit-tested in
 *   `@motion-studio/timeline` but never wired to a Timeline panel handle).
 * - No Export UI exists (Phase 15 explicitly deferred Export/AI/Audio/
 *   Effects wiring — `create-editor-kernel.ts`'s doc comment).
 * - There is no way to create a synthetic Text layer at all — every Layer
 *   in the running app is asset-driven (`TimelineEditorService.addClipFromAsset`);
 *   Font assets are explicitly rejected from the Timeline.
 *
 * So this test covers the real, currently-drivable subset: import an
 * image asset → drag it onto a Timeline track → select it → edit a
 * property in the Inspector → move it → undo twice (move, then edit) →
 * redo twice. Trim/Export/synthetic-Text-layer remain untested until
 * their UI lands — see docs/19-testing/e2e.md "Open questions".
 */

// A real, decodable 2x2 opaque-red PNG (same fixture bytes used by
// apps/studio/src/editor-kernel/asset-manager.integration.test.ts).
const TWO_BY_TWO_RED_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP8z8Dwn4GBgYEJRIAwAB8XAgICR7MUAAAAAElFTkSuQmCC";

async function importTestAsset(page: Page, fileName: string): Promise<void> {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: "image/png",
    buffer: Buffer.from(TWO_BY_TWO_RED_PNG_BASE64, "base64"),
  });
  await expect(page.getByText(fileName, { exact: true })).toBeVisible();
}

async function dragOntoFirstTrackLane(page: Page, source: Locator): Promise<void> {
  // The Timeline panel renders each track's lane as a plain sibling div with
  // no identifying text/role — the first one (DOM order) is the "V1" video
  // track, matching `seedDefaultComposition`'s add order in
  // create-editor-kernel.ts.
  const firstLane = page.locator("div.relative.flex-1 > div.flex.flex-col > div").first();

  const sourceBox = await source.boundingBox();
  const laneBox = await firstLane.boundingBox();
  if (!sourceBox || !laneBox) {
    throw new Error("editing-flow: could not measure drag source/target bounding boxes");
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = laneBox.x + 40;
  const endY = laneBox.y + laneBox.height / 2;

  // dnd-kit's PointerSensor needs real intermediate pointermove events past
  // its 4px activation distance (`EditorShell`'s `activationConstraint`) —
  // a single jump from start to end never starts a drag.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 10, startY + 10, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.up();
}

test("import an asset, place it on the Timeline, edit it, move it, then undo/redo the whole chain", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Motion Studio" })).toBeVisible();

  const fileName = "photo.png";
  await importTestAsset(page, fileName);

  const assetTile = page.locator("div", { hasText: fileName }).filter({ hasText: "Image" }).last();
  await dragOntoFirstTrackLane(page, assetTile);

  const clip = page.getByRole("button", { name: fileName, exact: true });
  await expect(clip).toBeVisible();

  // dnd-kit's DndContext needs a beat after the drop to fully clear its
  // internal "active drag" state — clicking immediately after `mouse.up()`
  // is otherwise swallowed rather than reaching `ClipBar`'s `onClick`.
  await page.waitForTimeout(200);

  // Select it — a plain click (no movement) must not be swallowed by the
  // drag sensor (EditorShell's activation-distance guard is exactly what
  // makes this reliable — see its doc comment).
  await clip.click();
  await expect(page.getByText("Opacity")).toBeVisible();

  const opacityRow = page
    .locator("div", { has: page.getByText("Opacity", { exact: true }) })
    .last();
  const opacityInput = opacityRow.locator('input[type="number"]');
  await expect(opacityInput).toHaveValue("1");
  await opacityInput.fill("0.5");
  await opacityInput.blur();
  await expect(opacityInput).toHaveValue("0.5");

  const originalBox = await clip.boundingBox();
  if (!originalBox) throw new Error("editing-flow: clip has no bounding box before move");
  const originalLeft = originalBox.x;

  await page.mouse.move(
    originalBox.x + originalBox.width / 2,
    originalBox.y + originalBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(originalBox.x + 30, originalBox.y, { steps: 5 });
  await page.mouse.move(originalBox.x + 150, originalBox.y, { steps: 10 });
  await page.mouse.up();

  await expect.poll(async () => (await clip.boundingBox())?.x).not.toBeCloseTo(originalLeft, 0);
  const movedLeft = (await clip.boundingBox())?.x;

  const undoButton = page.getByRole("button", { name: "Undo", exact: true });
  const redoButton = page.getByRole("button", { name: "Redo", exact: true });

  // Undo #1: reverts the move.
  await undoButton.click();
  await expect.poll(async () => (await clip.boundingBox())?.x).toBeCloseTo(originalLeft, 0);

  // Undo #2: reverts the opacity edit.
  await undoButton.click();
  await expect(opacityInput).toHaveValue("1");

  // Redo #1: re-applies the opacity edit.
  await redoButton.click();
  await expect(opacityInput).toHaveValue("0.5");

  // Redo #2: re-applies the move.
  await redoButton.click();
  await expect.poll(async () => (await clip.boundingBox())?.x).toBeCloseTo(movedLeft ?? 0, 0);
});
