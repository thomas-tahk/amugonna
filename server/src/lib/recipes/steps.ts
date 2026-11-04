/**
 * Turn recipe instruction text into clean, ordered steps.
 * Handles TheMealDB's styles: CRLF lines, "STEP 1" headers, numbered lines, or one paragraph.
 * Pure, no dependencies. Idempotent on its own output joined with "\n".
 */

const STEP_HEADER = /^step\s*\d+\s*[:.)\-–—]*$/i;
// "STEP 1 - MAKE THE SAUCE": a heading, not an instruction
const STEP_TITLE = /^step\s*\d+\s*[:.)\-–—]?\s*(.+)$/i;
// "1 Preheat the oven" (no punctuation after the number)
const BARE_NUMBER = /^(\d{1,2})\s+(?=[A-Z])/;
const ABBREVIATION = /(?:\b(?:e\.g|i\.e|approx|tbsp|tsp|oz|min|mins|sec|lb|lbs|fl|etc|vs|ca|temp|incl|no)|\bc)\.$/i;
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
    .filter((l) => l.length > 0 && !STEP_HEADER.test(l) && !NUMBER_ONLY.test(l) && !isAllCapsHeader(l))
    .map((l) => l.replace(STEP_PREFIX, '').replace(NUM_PREFIX, '').trim())
    .filter((l) => l.length > 0);

  lines = stripBareSequence(lines);

  // One paragraph: split into sentences, gluing tiny fragments ("Season.") onto the previous step.
  if (lines.length === 1) {
    const out: string[] = [];
    for (const s of lines[0].split(SENTENCE_BREAK)) {
      const sentence = s.trim();
      if (!sentence) continue;
      const prev = out[out.length - 1];
      if (prev !== undefined && (sentence.length < MIN_FRAGMENT || ABBREVIATION.test(prev))) out[out.length - 1] += ` ${sentence}`;
      else out.push(sentence);
    }
    lines = out;
  }
  return lines;
}

function isAllCapsHeader(line: string): boolean {
  const m = STEP_TITLE.exec(line);
  if (!m) return false;
  const rest = m[1];
  return /[A-Z]/.test(rest) && !/[a-z]/.test(rest);
}

/** "1 Mix.\n2 Bake." -> strip the numbers, but only if every line is numbered 1,2,3... in order. */
function stripBareSequence(lines: string[]): string[] {
  if (lines.length < 2) return lines;
  const nums = lines.map((l) => BARE_NUMBER.exec(l)?.[1]);
  if (!nums.every((n, i) => n !== undefined && Number(n) === i + 1)) return lines;
  return lines.map((l) => l.replace(BARE_NUMBER, '').trim());
}
