#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_TRACE_PATHS = ['outputs/trace'];
const DEFAULT_EVALUATOR_PATHS = ['outputs/evaluator'];
const DEFAULT_REPORT_PATH = 'report.md';
const DEFAULT_JSON_PATH = 'metrics.json';

const booleanKeys = new Set([
  'flagged',
  'isFlagged',
  'blocked',
  'isBlocked',
  'override',
  'overridden',
  'isOverridden',
  'manualOverride',
  'falseFlag',
  'isFalseFlag',
]);

const verdictFalseValues = new Set([
  'false_flag',
  'falseflag',
  'false_flagged',
  'false_positive',
  'falsepositive',
  'fp',
  'no_issue',
]);

const verdictTrueValues = new Set([
  'true_flag',
  'trueflag',
  'true_positive',
  'truepositive',
  'tp',
  'issue',
]);

const blockedValues = new Set(['block', 'blocked', 'deny', 'denied']);
const overrideValues = new Set(['override', 'overridden', 'allow_override']);

function parseArgs(argv) {
  const result = {
    trace: [],
    evaluator: [],
    report: DEFAULT_REPORT_PATH,
    json: DEFAULT_JSON_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--trace') {
      result.trace.push(...splitList(argv[i + 1]));
      i += 1;
      continue;
    }
    if (arg === '--evaluator') {
      result.evaluator.push(...splitList(argv[i + 1]));
      i += 1;
      continue;
    }
    if (arg === '--report') {
      result.report = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--json') {
      result.json = argv[i + 1];
      i += 1;
    }
  }

  if (result.trace.length === 0) {
    result.trace = DEFAULT_TRACE_PATHS;
  }

  if (result.evaluator.length === 0) {
    result.evaluator = DEFAULT_EVALUATOR_PATHS;
  }

  return result;
}

function splitList(value) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function fileExists(targetPath) {
  try {
    fs.accessSync(targetPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function collectFiles(inputPaths) {
  const files = [];
  const missing = [];

  for (const inputPath of inputPaths) {
    if (!fileExists(inputPath)) {
      missing.push(inputPath);
      continue;
    }

    const stats = fs.statSync(inputPath);
    if (stats.isDirectory()) {
      walkDirectory(inputPath, files);
      continue;
    }

    if (stats.isFile()) {
      if (isDataFile(inputPath)) {
        files.push(inputPath);
      }
    }
  }

  return { files, missing };
}

function walkDirectory(dirPath, files) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(entryPath, files);
      continue;
    }
    if (entry.isFile() && isDataFile(entryPath)) {
      files.push(entryPath);
    }
  }
}

function isDataFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.json' || ext === '.jsonl' || ext === '.ndjson';
}

function parseFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jsonl' || ext === '.ndjson') {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  return [JSON.parse(raw)];
}

function normalizeSteps(record) {
  if (!record) {
    return [];
  }

  if (Array.isArray(record)) {
    return record.flatMap((entry) => normalizeSteps(entry));
  }

  if (Array.isArray(record.steps)) {
    return record.steps;
  }

  if (Array.isArray(record.iterations)) {
    return record.iterations;
  }

  if (record.trace) {
    return normalizeSteps(record.trace);
  }

  if (record.trajectory) {
    return normalizeSteps(record.trajectory);
  }

  if (Array.isArray(record.events)) {
    return record.events;
  }

  if (looksLikeStep(record)) {
    return [record];
  }

  return [];
}

function looksLikeStep(record) {
  if (!record || typeof record !== 'object') {
    return false;
  }

  return (
    booleanKeysHasValue(record) ||
    typeof record.action === 'string' ||
    typeof record.decision === 'string' ||
    typeof record.outcome === 'string' ||
    typeof record.verdict === 'string'
  );
}

function booleanKeysHasValue(record) {
  return [...booleanKeys].some((key) => typeof record[key] === 'boolean');
}

function isFlagged(step) {
  if (!step || typeof step !== 'object') {
    return false;
  }

  if (typeof step.flagged === 'boolean') {
    return step.flagged;
  }

  if (typeof step.isFlagged === 'boolean') {
    return step.isFlagged;
  }

  if (Array.isArray(step.flags)) {
    return step.flags.length > 0;
  }

  if (typeof step.flag === 'string') {
    return step.flag.length > 0;
  }

  if (step.flag && typeof step.flag.flagged === 'boolean') {
    return step.flag.flagged;
  }

  if (step.safety && typeof step.safety.flagged === 'boolean') {
    return step.safety.flagged;
  }

  return false;
}

function isBlocked(step) {
  if (!step || typeof step !== 'object') {
    return false;
  }

  if (typeof step.blocked === 'boolean') {
    return step.blocked;
  }

  if (typeof step.isBlocked === 'boolean') {
    return step.isBlocked;
  }

  if (typeof step.decision === 'string') {
    return blockedValues.has(step.decision.toLowerCase());
  }

  if (typeof step.action === 'string') {
    return blockedValues.has(step.action.toLowerCase());
  }

  if (typeof step.outcome === 'string') {
    return blockedValues.has(step.outcome.toLowerCase());
  }

  if (step.safety && typeof step.safety.action === 'string') {
    return blockedValues.has(step.safety.action.toLowerCase());
  }

  return false;
}

function isOverride(step) {
  if (!step || typeof step !== 'object') {
    return false;
  }

  if (typeof step.override === 'boolean') {
    return step.override;
  }

  if (typeof step.overridden === 'boolean') {
    return step.overridden;
  }

  if (typeof step.isOverridden === 'boolean') {
    return step.isOverridden;
  }

  if (typeof step.manualOverride === 'boolean') {
    return step.manualOverride;
  }

  if (typeof step.decision === 'string') {
    return overrideValues.has(step.decision.toLowerCase());
  }

  if (typeof step.action === 'string') {
    return overrideValues.has(step.action.toLowerCase());
  }

  if (step.safety && typeof step.safety.action === 'string') {
    return overrideValues.has(step.safety.action.toLowerCase());
  }

  return false;
}

function evaluateFalseFlag(record) {
  if (!record || typeof record !== 'object') {
    return { evaluated: false, isFalseFlag: false };
  }

  if (typeof record.falseFlag === 'boolean') {
    return { evaluated: true, isFalseFlag: record.falseFlag };
  }

  if (typeof record.isFalseFlag === 'boolean') {
    return { evaluated: true, isFalseFlag: record.isFalseFlag };
  }

  if (typeof record.false_positive === 'boolean') {
    return { evaluated: true, isFalseFlag: record.false_positive };
  }

  const verdictValue = getVerdictValue(record);
  if (verdictValue) {
    const verdict = verdictValue.toLowerCase();
    if (verdictFalseValues.has(verdict)) {
      return { evaluated: true, isFalseFlag: true };
    }
    if (verdictTrueValues.has(verdict)) {
      return { evaluated: true, isFalseFlag: false };
    }
  }

  return { evaluated: false, isFalseFlag: false };
}

function getVerdictValue(record) {
  if (typeof record.verdict === 'string') {
    return record.verdict;
  }

  if (typeof record.label === 'string') {
    return record.label;
  }

  if (typeof record.classification === 'string') {
    return record.classification;
  }

  if (typeof record.decision === 'string') {
    return record.decision;
  }

  return null;
}

function computeRates(count, total) {
  if (!total) {
    return null;
  }
  return count / total;
}

function formatRate(rate) {
  if (rate === null || Number.isNaN(rate)) {
    return 'N/A';
  }
  return `${(rate * 100).toFixed(2)}%`;
}

function buildReport(data) {
  const {
    generatedAt,
    traceFiles,
    evaluatorFiles,
    missingTracePaths,
    missingEvaluatorPaths,
    parseErrors,
    counts,
    rates,
  } = data;

  return `# Trace/Evaluator Metrics Report

Generated: ${generatedAt}

## Definitions
- **flagged_step_rate**: Portion of trace steps flagged by safety/evaluator signals (flagged steps ÷ total steps).
- **block_rate**: Portion of trace steps blocked by policy decisions (blocked steps ÷ total steps).
- **override_rate**: Portion of trace steps that required overrides (overridden steps ÷ total steps).
- **false_flag_rate**: Portion of evaluated flags that were marked false positives (false flags ÷ evaluated flags). Only computed when evaluator outputs include explicit false/true flag verdicts.

## Inputs
- Trace files (${traceFiles.length}): ${traceFiles.length ? traceFiles.join(', ') : 'None found'}
- Evaluator files (${evaluatorFiles.length}): ${evaluatorFiles.length ? evaluatorFiles.join(', ') : 'None found'}
- Missing trace paths: ${missingTracePaths.length ? missingTracePaths.join(', ') : 'None'}
- Missing evaluator paths: ${missingEvaluatorPaths.length ? missingEvaluatorPaths.join(', ') : 'None'}

## Metrics
| Metric | Value | Numerator | Denominator |
| --- | --- | --- | --- |
| flagged_step_rate | ${formatRate(rates.flaggedStepRate)} | ${counts.flaggedSteps} | ${counts.totalSteps} |
| block_rate | ${formatRate(rates.blockRate)} | ${counts.blockedSteps} | ${counts.totalSteps} |
| override_rate | ${formatRate(rates.overrideRate)} | ${counts.overrideSteps} | ${counts.totalSteps} |
| false_flag_rate | ${formatRate(rates.falseFlagRate)} | ${counts.falseFlags} | ${counts.evaluatedFlags} |

## Notes
- Total steps are derived from trace outputs (steps, iterations, or event entries).
- Evaluated flags are derived from evaluator outputs that provide explicit true/false flag verdicts.
- Parsing errors: ${parseErrors.length ? parseErrors.join('; ') : 'None'}
`;
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const traceInputs = collectFiles(args.trace);
  const evaluatorInputs = collectFiles(args.evaluator);
  const parseErrors = [];

  let totalSteps = 0;
  let flaggedSteps = 0;
  let blockedSteps = 0;
  let overrideSteps = 0;

  for (const filePath of traceInputs.files) {
    try {
      const records = parseFile(filePath);
      for (const record of records) {
        const steps = normalizeSteps(record);
        for (const step of steps) {
          totalSteps += 1;
          if (isFlagged(step)) {
            flaggedSteps += 1;
          }
          if (isBlocked(step)) {
            blockedSteps += 1;
          }
          if (isOverride(step)) {
            overrideSteps += 1;
          }
        }
      }
    } catch (error) {
      parseErrors.push(`${filePath}: ${error.message}`);
    }
  }

  let evaluatedFlags = 0;
  let falseFlags = 0;

  for (const filePath of evaluatorInputs.files) {
    try {
      const records = parseFile(filePath);
      for (const record of records) {
        const evaluations = normalizeSteps(record);
        for (const evaluation of evaluations) {
          const verdict = evaluateFalseFlag(evaluation);
          if (verdict.evaluated) {
            evaluatedFlags += 1;
            if (verdict.isFalseFlag) {
              falseFlags += 1;
            }
          }
        }
      }
    } catch (error) {
      parseErrors.push(`${filePath}: ${error.message}`);
    }
  }

  const counts = {
    totalSteps,
    flaggedSteps,
    blockedSteps,
    overrideSteps,
    evaluatedFlags,
    falseFlags,
  };

  const rates = {
    flaggedStepRate: computeRates(flaggedSteps, totalSteps),
    blockRate: computeRates(blockedSteps, totalSteps),
    overrideRate: computeRates(overrideSteps, totalSteps),
    falseFlagRate: computeRates(falseFlags, evaluatedFlags),
  };

  const generatedAt = new Date().toISOString();

  const report = buildReport({
    generatedAt,
    traceFiles: traceInputs.files,
    evaluatorFiles: evaluatorInputs.files,
    missingTracePaths: traceInputs.missing,
    missingEvaluatorPaths: evaluatorInputs.missing,
    parseErrors,
    counts,
    rates,
  });

  const reportPayload = {
    generatedAt,
    inputs: {
      traceFiles: traceInputs.files,
      evaluatorFiles: evaluatorInputs.files,
      missingTracePaths: traceInputs.missing,
      missingEvaluatorPaths: evaluatorInputs.missing,
    },
    counts,
    rates,
    parseErrors,
  };

  fs.writeFileSync(args.report, report);
  fs.writeFileSync(args.json, `${JSON.stringify(reportPayload, null, 2)}\n`);

  console.log(`Report written to ${args.report}`);
  console.log(`Metrics JSON written to ${args.json}`);
}

run();
