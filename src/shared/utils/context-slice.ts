/** Window of `size` chars centered on the last mention of `term`, so the LLM sees
 * the surrounding conversation instead of an arbitrary prefix of the transcript.
 * Falls back to the tail when the term isn't found verbatim. */
export function termContext(text: string, term: string, size: number): string {
  const index = text.toLowerCase().lastIndexOf(term.toLowerCase());
  if (index < 0) {
    return text.slice(-size);
  }
  const start = Math.max(0, index - Math.floor(size / 2));
  return text.slice(start, start + size);
}
