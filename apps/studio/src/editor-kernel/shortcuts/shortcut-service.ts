/**
 * Only the Global scope from `17-ui/shortcuts.md`'s "Focused Input → Modal
 * → Active Panel → Workspace → Global" priority list — there's no modal
 * system, per-panel focus tracking, or Workspace layer to prioritize over
 * yet (fixed layout, no docking engine this phase). Command Palette and
 * Macro recording aren't built either — the palette needs a much larger
 * searchable command registry than five bindings justifies, and macro
 * recording has an open ADR (record the Intent or the literal Command
 * sequence?) that isn't resolved.
 */
export type ShortcutScope = "Global";

export interface IShortcutBinding {
  readonly key: string;
  readonly commandId: string;
  readonly scope: ShortcutScope;
}

function normalizeKey(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">,
): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) {
    parts.push("Mod");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  parts.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
  return parts.join("+");
}

/**
 * Real scope-based dispatch and registration-time conflict detection
 * (`shortcuts.md`: "no silent overrides; the registrar is warned and must
 * resolve"), scaled down to one scope. Keyboard shortcuts are one of
 * several ways to invoke a Command per that doc — this only covers the
 * binding → commandId lookup; resolving `commandId` into an actual
 * dispatch is the caller's job (`EditorShell` maps commandId to whichever
 * Editor Service method it names).
 */
export class ShortcutService {
  private readonly bindings = new Map<string, IShortcutBinding>();

  register(binding: IShortcutBinding): void {
    const existing = this.bindings.get(this.bindingKey(binding.key, binding.scope));
    if (existing) {
      throw new Error(
        `ShortcutService: "${binding.key}" is already bound to "${existing.commandId}" in scope "${binding.scope}"`,
      );
    }
    this.bindings.set(this.bindingKey(binding.key, binding.scope), binding);
  }

  unregister(key: string, scope: ShortcutScope): void {
    this.bindings.delete(this.bindingKey(key, scope));
  }

  /** Returns the commandId bound to this keyboard event in `scope`, or `undefined` if nothing matches. */
  resolve(
    event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">,
    scope: ShortcutScope = "Global",
  ): string | undefined {
    return this.bindings.get(this.bindingKey(normalizeKey(event), scope))?.commandId;
  }

  private bindingKey(key: string, scope: ShortcutScope): string {
    return `${scope}:${key}`;
  }
}
