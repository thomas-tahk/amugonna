/**
 * Turn recipe instruction text into clean, ordered steps.
 * Handles TheMealDB's styles: CRLF lines, "STEP 1" headers, numbered lines, or one paragraph.
 * Pure, no dependencies. Idempotent on its own output joined with "\n".
 */

const STEP_HEADER = /^step\s*\d+\s*[:.)\-–—]*$/i;
const NUMBER_ONLY = /^\d+\s*[.)]?$/;
const STEP_PREFIX = /^step\s*\d+\s*[:.)\-–—]\s*|^step\s*\d+\s+/i;
// "1. ", "2) ", "3 - " — but never "2 eggs"
const NUM_PREFIX = /^\d+\s*[.)]\s+|^\d+\s+[-–—]\s+/;
const SENTENCE_BREAK = /(?<=[.!?])\s+(?=[A-Z"'(])/;
const MIN_FRAGMENT = 20;

export function splitSteps(instructions: string): string[] {
  if (!instructions || typeof instructions !== 'string') return [];

  let lines = instructions
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !STEP_HEADER.test(l) && !NUMBER_ONLY.test(l))
    .map((l) => l.replace(STEP_PREFIX, '').replace(NUM_PREFIX, '').trim())
    .filter((l) => l.length > 0);

  // One paragraph: split into sentences, gluing tiny fragments ("Season.") onto the previous step.
  if (lines.length === 1) {
    const out: string[] = [];
    for (const s of lines[0].split(SENTENCE_BREAK)) {
      const sentence = s.trim();
      if (!sentence) continue;
      if (out.length > 0 && sentence.length < MIN_FRAGMENT) out[out.length - 1] += ` ${sentence}`;
      else out.push(sentence);
    }
    lines = out;
  }
  return lines;
}
