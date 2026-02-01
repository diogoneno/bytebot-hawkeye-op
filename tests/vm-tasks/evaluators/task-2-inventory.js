const fs = require('fs');
const { output, readFileTrimmed } = require('./evaluator-utils');

const outputPath = '/tmp/bytebot-task-outputs/inventory-merged.json';
const expectedPath = 'tests/vm-tasks/fixtures/task-2/expected-merged.json';

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

const normalize = (items) =>
  items.map((item) => ({
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
  }));

const actualNormalized = normalize(actual);
const expectedNormalized = normalize(expected);

const actualString = JSON.stringify(actualNormalized);
const expectedString = JSON.stringify(expectedNormalized);

if (actualString !== expectedString) {
  output.fail('Merged inventory does not match expected output.');
}

output.pass('Merged inventory matches expected output.');
