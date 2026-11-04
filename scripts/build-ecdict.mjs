/**
 * Generate the extension's bundled offline dictionary from the full ECDICT CSV.
 *
 * Usage:
 *   node scripts/build-ecdict.mjs [--input /tmp/ecdict.csv] [--output data/ecdict.json.gz]
 *
 * ECDICT: https://github.com/skywind3000/ECDICT (MIT License)
 * Keeps only common words carrying frequency/Collins/Oxford markers to limit size; the gzip output is roughly 6–8 MB.
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
const outputIndex = args.indexOf('--output');
const input = inputIndex >= 0 ? args[inputIndex + 1] : '/tmp/ecdict.csv';
const output = outputIndex >= 0 ? args[outputIndex + 1] : 'data/ecdict.json.gz';

const MAX_WORDS = 120000;
const MAX_TRANSLATION = 220;
const FRQ_LIMIT = 50000;
const BNC_LIMIT = 50000;

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function cleanTranslation(value) {
  const lines = String(value || '')
    .split(/\\n|\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\[[^\]]*\]\s*$/.test(line));
  let text = lines.slice(0, 3).join('\\n');
  if (text.length > MAX_TRANSLATION) text = text.slice(0, MAX_TRANSLATION);
  return text;
}

function shouldKeep(word, collins, oxford, tag, bnc, frq) {
  if (!/^[A-Za-z][A-Za-z'’-]*$/.test(word)) return false;
  if (word.length < 1 || word.length > 24) return false;
  if (Number(collins) > 0 || Number(oxford) === 1) return true;
  if (tag && tag.trim()) return true;
  if (Number(frq) > 0 && Number(frq) <= FRQ_LIMIT) return true;
  if (Number(bnc) > 0 && Number(bnc) <= BNC_LIMIT) return true;
  return false;
}

async function* readRows(file) {
  const stream = createReadStream(file, { encoding: 'utf8' });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  let index = 0;
  for await (const line of reader) {
    index += 1;
    if (index === 1 && line.toLowerCase().startsWith('word,')) continue;
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    if (fields.length < 10) continue;
    yield {
      index,
      word: fields[0].trim(),
      phonetic: fields[1].trim(),
      translation: cleanTranslation(fields[3]),
      pos: fields[4].trim(),
      collins: Number(fields[5] || 0),
      oxford: Number(fields[6] || 0),
      tag: fields[7].trim(),
      bnc: Number(fields[8] || 0),
      frq: Number(fields[9] || 0),
      // Inflection data looks like "0:deprecate/1:dp/p:deprecated"; each segment's text after the colon is a base form or variant.
      exchange: (fields[10] || '').trim()
    };
  }
}

/** Inflected forms (plural, past tense, -ing, etc.) are kept only when their base form qualifies. */
function baseFormsOf(exchange) {
  if (!exchange) return [];
  return exchange
    .split('/')
    .map((part) => part.slice(part.indexOf(':') + 1).trim().toLowerCase())
    .filter((value) => value && /^[a-z][a-z'’-]*$/.test(value));
}

async function main() {
  console.log(`Reading ${input}`);

  // First pass: pick core words by frequency/Collins/tags to build the base-form set.
  const bases = new Set();
  let total = 0;
  for await (const row of readRows(input)) {
    total = row.index;
    if (!row.translation) continue;
    if (!shouldKeep(row.word, row.collins, row.oxford, row.tag, row.bnc, row.frq)) continue;
    bases.add(row.word.toLowerCase());
  }
  console.log(`Core words: ${bases.size}`);

  // Second pass: core words plus their inflected forms.
  const words = Object.create(null);
  let kept = 0;
  for await (const row of readRows(input)) {
    if (!row.translation) continue;
    const base = row.word.toLowerCase();
    const direct = shouldKeep(row.word, row.collins, row.oxford, row.tag, row.bnc, row.frq);
    const variant = !direct && baseFormsOf(row.exchange).some((form) => bases.has(form));
    if (!direct && !variant) continue;

    if (!words[base]) kept += 1;
    words[base] = [row.phonetic, row.translation, row.pos, row.collins, row.oxford, row.bnc, row.frq];
    if (kept >= MAX_WORDS) break;
  }

  const payload = {
    version: 1,
    meta: {
      source: 'https://github.com/skywind3000/ECDICT',
      license: 'MIT',
      generatedAt: new Date().toISOString(),
      count: kept
    },
    words
  };

  const json = JSON.stringify(payload);
  const compressed = gzipSync(Buffer.from(json, 'utf8'), { level: 9 });
  mkdirSync(dirname(output), { recursive: true });
  const writer = createWriteStream(output);
  writer.write(compressed);
  writer.end();

  console.log(`CSV rows: ${total}, entries kept: ${kept}`);
  console.log(`Uncompressed: ${(json.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Output: ${output} (${(compressed.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
