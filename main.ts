// Seventeen Syllables of Debugging — entry program.
//
// Reads the haiku from haiku.txt next to this file, checks it is exactly
// three lines in the 5-7-5 syllable shape and at most 200 characters, then
// writes it to $MAKEFUN_OUTPUT_DIR/entry.txt (or /output/entry.txt).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXPECTED_SYLLABLES = [5, 7, 5];
const MAX_CHARS = 200;

// A small, deterministic syllable counter for ordinary English words.
// It counts vowel groups, drops a silent trailing "e", and treats a
// trailing "ed" after a consonant other than t/d as silent (worked -> 1).
function countSyllables(rawWord) {
  const token = rawWord.trim().toLowerCase();
  if (token === "a.m." || token === "p.m.") return 2;
  const word = token.replace(/[^a-z]/g, "");
  if (word.length === 0) return 0;
  const groups = word.match(/[aeiouy]+/g) ?? [];
  let count = groups.length;
  if (word.endsWith("e") && count > 1) count -= 1;
  if (
    word.endsWith("ed") &&
    count > 1 &&
    !word.endsWith("ted") &&
    !word.endsWith("ded")
  ) {
    count -= 1;
  }
  return Math.max(count, 1);
}

function checkHaiku(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  if (lines.length !== 3) {
    throw new Error(`expected 3 lines, got ${lines.length}`);
  }
  if (text.length > MAX_CHARS) {
    throw new Error(`haiku is ${text.length} chars, over the ${MAX_CHARS} cap`);
  }
  lines.forEach((line, i) => {
    const words = line.split(/\s+/).filter(Boolean);
    const total = words.reduce((sum, w) => sum + countSyllables(w), 0);
    if (total !== EXPECTED_SYLLABLES[i]) {
      throw new Error(
        `line ${i + 1} has ${total} syllables, expected ${EXPECTED_SYLLABLES[i]}: ${line}`,
      );
    }
  });
  return lines;
}

const haikuPath = join(HERE, "haiku.txt");
const text = readFileSync(haikuPath, "utf8");
const lines = checkHaiku(text);
const body = lines.join("\n") + "\n";

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "entry.txt");
writeFileSync(outPath, body, "utf8");
console.log(`wrote ${body.length} chars to ${outPath}`);
