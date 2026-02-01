const fs = require('fs');
const { output, readFileTrimmed } = require('./evaluator-utils');

const outputPath = '/tmp/bytebot-task-outputs/report-summary.json';
const expectedPath = 'tests/vm-tasks/fixtures/task-3/expected-summary.json';

const actualRaw = readFileTrimmed(outputPath);
let actual;
let expected;

try {
  actual = JSON.parse(actualRaw);
} catch (error) {
  output.fail(`Output JSON could not be parsed: ${error.message}`);
}

try {
  expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
} catch (error) {
  output.fail(`Expected JSON could not be parsed: ${error.message}`);
}

const headingMatch = actual.headingCount === expected.headingCount;
const wordMatch = actual.wordCount === expected.wordCount;

if (!headingMatch || !wordMatch) {
  output.fail(
    `Counts mismatch. Expected headingCount=${expected.headingCount}, wordCount=${expected.wordCount}.`,
  );
}

output.pass('Summary counts match expected values.');
