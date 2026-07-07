import type { IPluginAPI } from "./plugin-api";

/**
 * Public contract every plugin implements — PLAN.md Phase 14: "id, name,
 * version, activate(api)/deactivate()". `docs/16-plugin-system/plugin-api.md`'s
 * stub also listed `initialize()/destroy()/serialize()/deserialize()`; that
 * was pre-Phase-14 planning-history wording superseded by PLAN.md's own
 * checklist (this project's authoritative source, per PLAN.md's own header).
 * Settings persistence (`serialize`/`deserialize`) isn't in PLAN.md's Phase
 * 14 scope and isn't implemented — left as an open question, same as every
 * other explicitly-out-of-scope item flagged in prior phases.
 */
export interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  activate(api: IPluginAPI): void | Promise<void>;
  deactivate(): void | Promise<void>;
}
