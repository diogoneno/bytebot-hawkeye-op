const { output, readFileTrimmed } = require('./evaluator-utils');

const outputPath = '/tmp/bytebot-task-outputs/lcg-sequence.txt';
const expected = [
  78628734,
  1460962527,
  934458668,
  1985133557,
  721214858,
];

const contents = readFileTrimmed(outputPath);
const lines = contents.split(/\r?\n/).filter(Boolean);

if (lines.length !== expected.length) {
  output.fail(`Expected ${expected.length} lines, got ${lines.length}.`);
}

const parsed = lines.map((line) => Number(line.trim()));
if (parsed.some((value) => Number.isNaN(value))) {
  output.fail('One or more lines are not valid numbers.');
}

for (let i = 0; i < expected.length; i += 1) {
  if (parsed[i] !== expected[i]) {
    output.fail(`Mismatch at index ${i}: expected ${expected[i]}, got ${parsed[i]}.`);
  }
}

output.pass('Sequence matches expected LCG output.');
