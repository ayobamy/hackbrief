// Words sources put where a fact is still unknown: "TBA", "N/A", a lone dash of any length.
const PLACEHOLDER = /^(?:tba|tbd|tbc|n\/?a|none|unknown|[-–—]+)$/i;

/** True for text that only says the fact is not known yet, so it is not worth storing or showing. */
export function isPlaceholder(text: string): boolean {
  return PLACEHOLDER.test(text.trim());
}
