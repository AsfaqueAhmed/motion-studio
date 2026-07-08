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

/** Drags `source` onto the first (topmost, "V1") Timeline track lane via real pointer events. */
async function dragOnto(
  page: Page,
  source: Locator,
  target: Locator,
  targetOffsetX = 40,
): Promise<void> {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error("editing-flow: could not measure drag source/target bounding boxes");
  }

  // dnd-kit's PointerSensor needs real intermediate pointermove events past
  // its 4px activation distance (`EditorShell`'s `activationConstraint`) —
  // a single jump from start to end never starts a drag.
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + 10, sourceBox.y + 10, { steps: 5 });
  await page.mouse.move(targetBox.x + targetOffsetX, targetBox.y + targetBox.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
}

test("import an asset, place it on the Timeline, edit it, move it, then undo/redo the whole chain", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Motion Studio" })).toBeVisible();

  const fileName = "photo.png";
  await importTestAsset(page, fileName);

  // The Timeline panel renders each track's lane as a plain sibling div with
  // no identifying text/role — the first one (DOM order) is the "V1" video
  // track, matching `seedDefaultComposition`'s add order in
  // create-editor-kernel.ts.
  const firstLane = page.locator("div.relative.flex-1 > div.flex.flex-col > div").first();
  const assetTile = page.locator("div", { hasText: fileName }).filter({ hasText: "Image" }).last();
  await dragOnto(page, assetTile, firstLane);

  const clip = page.getByRole("button", { name: fileName, exact: true });
  await expect(clip).toBeVisible();

  // Browsers fire a synthetic click after any mouse-based drag ends, and
  // dnd-kit swallows exactly one subsequent click globally to suppress
  // it — confirmed by direct comparison, this also eats the *next real
  // click* a test (or user) makes right after a drag finishes, even on an
  // unrelated element. A short wait lets that suppression window pass
  // before the deliberate selection click below.
  await page.waitForTimeout(200);

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

  const originalLeft = (await clip.boundingBox())?.x;
  if (originalLeft === undefined) throw new Error("editing-flow: clip has no bounding box");

  // Grab near the clip's left edge (not its center) and move by a fixed,
  // strictly-positive relative delta — the clip is ~900px wide at the
  // default zoom (2700 ticks / 3 ticks-per-pixel), so grabbing its center
  // and moving to a fixed absolute x can compute a *negative* delta,
  // clamp to tick 0, and silently no-op.
  const clipBox = await clip.boundingBox();
  if (!clipBox) throw new Error("editing-flow: clip has no bounding box before move");
  const grabX = clipBox.x + 20;
  const grabY = clipBox.y + clipBox.height / 2;
  await page.mouse.move(grabX, grabY);
  await page.mouse.down();
  await page.mouse.move(grabX + 10, grabY, { steps: 5 });
  await page.mouse.move(grabX + 200, grabY, { steps: 10 });
  await page.mouse.up();

  await expect.poll(async () => (await clip.boundingBox())?.x).not.toBeCloseTo(originalLeft, 0);
  const movedLeft = (await clip.boundingBox())?.x;

  // Undo/redo via the `Mod+Z`/`Mod+Shift+Z` keyboard shortcuts
  // (`EditorShell`'s `GLOBAL_BINDINGS`), not the Toolbar's Undo/Redo
  // buttons: browsers fire a synthetic click after any mouse-based drag
  // ends, and dnd-kit swallows exactly one subsequent click globally to
  // suppress it — which also eats the *next real click* a test (or user)
  // makes right after finishing a drag, e.g. on an unrelated toolbar
  // button. Confirmed by direct comparison — `undoButton.click()`
  // immediately after the move above was reliably a no-op, while the
  // identical action one interaction later, or via keyboard, was not.
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await clip.boundingBox())?.x).toBeCloseTo(originalLeft, 0);

  await page.keyboard.press("Control+z");
  await expect(opacityInput).toHaveValue("1");

  await page.keyboard.press("Control+Shift+z");
  await expect(opacityInput).toHaveValue("0.5");

  await page.keyboard.press("Control+Shift+z");
  await expect.poll(async () => (await clip.boundingBox())?.x).toBeCloseTo(movedLeft ?? 0, 0);
});
