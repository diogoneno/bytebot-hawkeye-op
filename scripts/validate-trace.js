#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const VALID_EVENT_TYPES = new Set([
  'step_start',
  'step_end',
  'obs_pre',
  'action',
  'obs_post',
  'outcome',
  'errors',
]);

const REQUIRED_FIELDS = {
  event_type: 'string',
  run_id: 'string',
  episode_id: 'string',
  step_id: 'integer',
  vm_snapshot_id: 'string',
  task_id: 'string',
  seed: 'integer',
};

function isInteger(value) {
  return Number.isInteger(value);
}

function validateFieldType(value, type) {
  if (type === 'integer') {
    return isInteger(value);
  }
  return typeof value === type;
}

function validateEvent(event, lineNumber) {
  if (typeof event !== 'object' || event === null || Array.isArray(event)) {
    return `Line ${lineNumber}: event must be an object.`;
  }

  for (const [field, type] of Object.entries(REQUIRED_FIELDS)) {
    if (!(field in event)) {
      return `Line ${lineNumber}: missing required field "${field}".`;
    }
    if (!validateFieldType(event[field], type)) {
      return `Line ${lineNumber}: field "${field}" must be ${type}.`;
    }
  }

  if (!VALID_EVENT_TYPES.has(event.event_type)) {
    return `Line ${lineNumber}: invalid event_type "${event.event_type}".`;
  }

  return null;
}

function validateTrace(filePath) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  const contents = fs.readFileSync(resolvedPath, 'utf8');
  const lines = contents.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('Trace file is empty.');
  }

  const errors = [];
  lines.forEach((line, index) => {
    let event;
    try {
      event = JSON.parse(line);
    } catch (error) {
      errors.push(`Line ${index + 1}: invalid JSON (${error.message}).`);
      return;
    }

    const validationError = validateEvent(event, index + 1);
    if (validationError) {
      errors.push(validationError);
    }
  });

  return errors;
}

function main() {
  const [filePath] = process.argv.slice(2);
  if (!filePath) {
    console.error('Usage: node scripts/validate-trace.js <trace.jsonl>');
    process.exit(1);
  }

  try {
    const errors = validateTrace(filePath);
    if (errors.length > 0) {
      console.error('Trace validation failed:');
      errors.forEach((error) => console.error(`- ${error}`));
      process.exit(1);
    }
  } catch (error) {
    console.error(`Trace validation failed: ${error.message}`);
    process.exit(1);
  }

  console.log('Trace validation passed.');
}

main();
