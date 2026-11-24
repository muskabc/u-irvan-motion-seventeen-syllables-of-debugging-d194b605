// Seventeen Syllables of Debugging — entry program.
//
// Takes the haiku kept in haiku.txt beside this file, proves it fits the
// contest shape (three lines, 5-7-5 syllables, 1-200 characters, not blank),
// and leaves it at $MAKEFUN_OUTPUT_DIR/entry.txt (default /output/entry.txt).
// The output is deterministic: the same haiku always produces the same bytes.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SHAPE = [5, 7, 5];
const CHAR_LIMIT = 200;
const HERE = dirname(fileURLToPath(import.meta.url));

// Words whose spoken syllables the vowel-group rule gets wrong.
const KNOWN_COUNTS = new Map([
  ["a.m.", 2],
  ["p.m.", 2],
  // Two silent e's in one word (else + where): the rule drops only one.
  ["elsewhere", 2],
]);

function vowelGroups(word) {
  return word.match(/[aeiouy]+/g) ?? [];
}

// A word-final "e" is usually silent, but the two cases must not stack:
// in "worked" the "e" of "-ed" is the silent one, and in "wanted" the "e"
// of "-ed" is sounded. Counting both a silent "e" and a silent "ed"
// double-subtracts words like "happened" (3 vowel groups, 2 syllables).
function dropSilentFinalE(word, groups) {
  if (word.endsWith("ed")) {
    if (word.endsWith("ted") || word.endsWith("ded")) return groups;
    return Math.max(groups - 1, 1);
  }
  if (word.endsWith("e") && groups > 1) return groups - 1;
  return groups;
}

function syllablesOf(raw) {
  const token = raw.trim().toLowerCase();
  if (KNOWN_COUNTS.has(token)) return KNOWN_COUNTS.get(token);
  const letters = token.replace(/[^a-z]/g, "");
  if (letters.length === 0) return 0;
  const groups = vowelGroups(letters).length;
  return Math.max(dropSilentFinalE(letters, groups), 1);
}

function splitLines(text) {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  while (rawLines.length > 0 && rawLines.at(-1) === "") rawLines.pop();
  return rawLines.map((line) => line.trim());
}

// Every problem is collected first, so one run reports all of them instead
// of stopping at the first thing wrong.
function validate(text) {
  const problems = [];
  if (text.trim().length === 0) problems.push("haiku is blank");
  if (text.length > CHAR_LIMIT) {
    problems.push(`haiku is ${text.length} chars, over the ${CHAR_LIMIT} cap`);
  }
  const lines = splitLines(text);
  if (lines.length !== SHAPE.length) {
    problems.push(`expected ${SHAPE.length} lines, got ${lines.length}`);
  }
  lines.forEach((line, index) => {
    const words = line.split(/\s+/).filter(Boolean);
    const total = words.reduce((sum, word) => sum + syllablesOf(word), 0);
    if (total !== SHAPE[index]) {
      problems.push(
        `line ${index + 1} has ${total} syllables, expected ${SHAPE[index]}: ${line}`,
      );
    }
  });
  if (problems.length > 0) {
    throw new Error(`invalid haiku:\n- ${problems.join("\n- ")}`);
  }
  return lines;
}

function main() {
  const source = join(HERE, "haiku.txt");
  const text = readFileSync(source, "utf8");
  const lines = validate(text);
  const body = `${lines.join("\n")}\n`;

  const dir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(dir, { recursive: true });
  const target = join(dir, "entry.txt");
  writeFileSync(target, body, "utf8");

  // Read the file back and prove the bytes on disk are exactly what we wrote.
  const written = readFileSync(target, "utf8");
  if (written !== body) {
    throw new Error(`round-trip mismatch: ${target} differs from the haiku`);
  }
  console.log(`wrote ${body.length} chars to ${target}`);
}

main();
