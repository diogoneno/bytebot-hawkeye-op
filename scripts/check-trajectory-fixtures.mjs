import fs from 'fs/promises';
import path from 'path';
import assert from 'node:assert/strict';

const fixturesDir = path.resolve('tests/fixtures/trajectories');
const fixtureFiles = (await fs.readdir(fixturesDir))
  .filter((file) => file.endsWith('.jsonl'))
  .sort();

assert.ok(fixtureFiles.length > 0, 'No JSONL fixture files found.');

const toNumber = (value, context) => {
  assert.equal(typeof value, 'number', `${context} must be a number.`);
  return value;
};

const toString = (value, context) => {
  assert.equal(typeof value, 'string', `${context} must be a string.`);
  assert.ok(value.length > 0, `${context} must not be empty.`);
  return value;
};

const toDate = (value, context) => {
  const dateValue = new Date(toString(value, context));
  assert.ok(!Number.isNaN(dateValue.getTime()), `${context} must be ISO date string.`);
  return dateValue;
};

const toArray = (value, context) => {
  assert.ok(Array.isArray(value), `${context} must be an array.`);
  return value;
};

const roundTo = (value, precision = 6) => {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

const validateIteration = (iteration, index, fileName) => {
  assert.equal(typeof iteration, 'object', `Iteration ${index} in ${fileName} must be an object.`);
  toNumber(iteration.iterationNumber, `iterations[${index}].iterationNumber`);
  toString(iteration.systemPrompt, `iterations[${index}].systemPrompt`);
  toArray(iteration.messages, `iterations[${index}].messages`);
  if (iteration.toolCalls !== undefined) {
    toArray(iteration.toolCalls, `iterations[${index}].toolCalls`);
  }
  if (iteration.toolResults !== undefined) {
    toArray(iteration.toolResults, `iterations[${index}].toolResults`);
  }
  assert.equal(typeof iteration.tokenUsage, 'object', `iterations[${index}].tokenUsage must be object.`);
  toNumber(iteration.tokenUsage.input, `iterations[${index}].tokenUsage.input`);
  toNumber(iteration.tokenUsage.output, `iterations[${index}].tokenUsage.output`);
  toDate(iteration.timestamp, `iterations[${index}].timestamp`);
};

const computeMetrics = (iterations) => {
  const iterationCount = iterations.length;
  const toolCallsCount = iterations.reduce(
    (count, iteration) => count + (iteration.toolCalls?.length || 0),
    0,
  );
  const tokenUsage = iterations.reduce(
    (totals, iteration) => ({
      input: totals.input + iteration.tokenUsage.input,
      output: totals.output + iteration.tokenUsage.output,
    }),
    { input: 0, output: 0 },
  );
  const errorCount = iterations.reduce(
    (count, iteration) =>
      count +
      (iteration.toolResults?.filter((result) => result.status === 'error').length || 0),
    0,
  );
  const userInterventions = iterations.reduce(
    (count, iteration) =>
      count +
      (iteration.toolResults?.filter((result) => result.type === 'user_intervention').length || 0),
    0,
  );
  const errorRate = toolCallsCount > 0 ? errorCount / toolCallsCount : 0;

  return {
    iterationCount,
    toolCallsCount,
    tokenUsage: {
      input: tokenUsage.input,
      output: tokenUsage.output,
      total: tokenUsage.input + tokenUsage.output,
    },
    errorRate,
    userInterventions,
  };
};

const compareMetrics = (expected, actual, fileName) => {
  assert.equal(expected.iterationCount, actual.iterationCount, `${fileName} iterationCount mismatch.`);
  assert.equal(expected.toolCallsCount, actual.toolCallsCount, `${fileName} toolCallsCount mismatch.`);
  assert.equal(expected.tokenUsage.input, actual.tokenUsage.input, `${fileName} tokenUsage.input mismatch.`);
  assert.equal(expected.tokenUsage.output, actual.tokenUsage.output, `${fileName} tokenUsage.output mismatch.`);
  assert.equal(expected.tokenUsage.total, actual.tokenUsage.total, `${fileName} tokenUsage.total mismatch.`);
  assert.equal(roundTo(expected.errorRate), roundTo(actual.errorRate), `${fileName} errorRate mismatch.`);
  assert.equal(expected.userInterventions, actual.userInterventions, `${fileName} userInterventions mismatch.`);
  if (expected.qualityScore !== undefined) {
    assert.equal(typeof expected.qualityScore, 'number', `${fileName} qualityScore must be number.`);
    assert.ok(expected.qualityScore >= 0 && expected.qualityScore <= 1, `${fileName} qualityScore out of range.`);
  }
};

for (const fileName of fixtureFiles) {
  const filePath = path.join(fixturesDir, fileName);
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  assert.ok(lines.length > 0, `${fileName} must contain at least one JSONL line.`);

  for (const [index, line] of lines.entries()) {
    let payload;
    try {
      payload = JSON.parse(line);
    } catch (error) {
      throw new Error(`${fileName} line ${index + 1} is not valid JSON: ${error.message}`);
    }

    assert.equal(typeof payload, 'object', `${fileName} line ${index + 1} must be object.`);
    toString(payload.taskId, `${fileName} taskId`);
    toString(payload.modelProvider, `${fileName} modelProvider`);
    toString(payload.modelName, `${fileName} modelName`);
    assert.equal(typeof payload.success, 'boolean', `${fileName} success must be boolean.`);
    toDate(payload.startedAt, `${fileName} startedAt`);
    if (payload.completedAt !== undefined) {
      toDate(payload.completedAt, `${fileName} completedAt`);
    }

    const iterations = toArray(payload.iterations, `${fileName} iterations`);
    iterations.forEach((iteration, iterationIndex) =>
      validateIteration(iteration, iterationIndex, fileName),
    );

    assert.equal(typeof payload.metrics, 'object', `${fileName} metrics must be object.`);
    const expectedMetrics = payload.metrics;
    const computedMetrics = computeMetrics(iterations);
    compareMetrics(expectedMetrics, computedMetrics, fileName);
  }
}

console.log(`Validated ${fixtureFiles.length} trajectory fixture file(s).`);
