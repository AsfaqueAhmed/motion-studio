# Changelog

## Unreleased

- Initial documentation corpus assembled and reconciled from the full
  design history (product vision through editor framework).
- Resolved several duplicate subsystem specifications (Tool System,
  Intent Layer, Asset Management) — see `DECISIONS.md` ADR-001, ADR-002.
- Resolved naming collisions (`Layer`, `Scene Graph` vs. `Composition
Graph`, `ViewportCamera` vs. `SceneCamera`, the two `Property Registry`s)
  — see `GLOSSARY.md` and `DECISIONS.md` ADR-003, ADR-004, ADR-006–008.
- Flagged and fact-checked concrete technical risks in export/muxing,
  shader portability, and audio clock sync — see `ARCHITECTURE.md` §6.
- Added a spike-first MVP plan (`24-roadmap/mvp.md`) to validate the two
  highest-risk assumptions before further engine implementation.
