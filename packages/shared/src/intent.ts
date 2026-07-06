/**
 * What the user wants, independent of how it's achieved. Resolved by an
 * Editor Service into one or more typed Commands. See docs/17-ui/panels.md
 * and GLOSSARY.md "Intent".
 */
export interface IIntent<TType extends string = string, TPayload = unknown> {
  readonly type: TType;
  readonly payload: TPayload;
}
