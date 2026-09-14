/** Strip common list markers from the start of a line (1. 1) - * • etc). */
export function stripListMarker (line: string): string {
  return line
    // Numbered markers require a following space so "1.5 cups" stays intact.
    // Bullets allow an optional space so "-flour" still strips.
    .replace(/^\s*(?:\d+[.)\]]\s+|[-*•–—▪◦]\s*)/, '')
    .trim()
}

/** Split free-form text into trimmed lines with list markers removed. */
export function parseListLines (text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => stripListMarker(line))
    .filter((line) => line.length > 0)
}
