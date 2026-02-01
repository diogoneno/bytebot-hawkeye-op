#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Run the KineticBench-5 suite end-to-end using the evaluator runner and recorder.

Usage:
  scripts/run-kineticbench-5.sh [--suite NAME] [--output-dir PATH]
                              [--runner-cmd CMD] [--recorder-cmd CMD]
                              [--vm-snapshot PATH]

Options:
  --suite NAME         Suite name to run (default: KineticBench-5)
  --output-dir PATH    Output root for traces/, results/, and report.md
  --runner-cmd CMD     Evaluator runner command (default: evaluator-runner)
  --recorder-cmd CMD   Evaluator recorder command (default: evaluator-recorder)
  --vm-snapshot PATH   VM snapshot path passed to runner/recorder when set
  -h, --help           Show this help

Environment overrides:
  RUNNER_EXTRA_ARGS    Extra args appended to runner invocation
  RECORDER_EXTRA_ARGS  Extra args appended to recorder invocation
  KINETICBENCH_SUITE_CONFIG  Path to suite config passed to runner/recorder
USAGE
}

suite_name="KineticBench-5"
output_root=""
runner_cmd="evaluator-runner"
recorder_cmd="evaluator-recorder"
vm_snapshot=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --suite)
      suite_name="$2"
      shift 2
      ;;
    --output-dir)
      output_root="$2"
      shift 2
      ;;
    --runner-cmd)
      runner_cmd="$2"
      shift 2
      ;;
    --recorder-cmd)
      recorder_cmd="$2"
      shift 2
      ;;
    --vm-snapshot)
      vm_snapshot="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
 done

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
if [[ -z "$output_root" ]]; then
  output_root="$repo_root"
fi

traces_dir="$output_root/traces"
results_dir="$output_root/results"
report_path="$output_root/report.md"

mkdir -p "$traces_dir" "$results_dir"

if ! command -v "$runner_cmd" >/dev/null 2>&1; then
  echo "Runner command not found: $runner_cmd" >&2
  exit 1
fi

if ! command -v "$recorder_cmd" >/dev/null 2>&1; then
  echo "Recorder command not found: $recorder_cmd" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to generate report.md" >&2
  exit 1
fi

start_ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

runner_args=("--suite" "$suite_name" "--results-dir" "$results_dir" "--traces-dir" "$traces_dir")
recorder_args=("--suite" "$suite_name" "--output" "$traces_dir")

if [[ -n "${KINETICBENCH_SUITE_CONFIG:-}" ]]; then
  runner_args=("--suite-config" "$KINETICBENCH_SUITE_CONFIG" "--results-dir" "$results_dir" "--traces-dir" "$traces_dir")
  recorder_args=("--suite-config" "$KINETICBENCH_SUITE_CONFIG" "--output" "$traces_dir")
fi

if [[ -n "$vm_snapshot" ]]; then
  runner_args+=("--vm-snapshot" "$vm_snapshot")
  recorder_args+=("--vm-snapshot" "$vm_snapshot")
fi

if [[ -n "${RUNNER_EXTRA_ARGS:-}" ]]; then
  read -r -a runner_extra <<<"$RUNNER_EXTRA_ARGS"
  runner_args+=("${runner_extra[@]}")
fi

if [[ -n "${RECORDER_EXTRA_ARGS:-}" ]]; then
  read -r -a recorder_extra <<<"$RECORDER_EXTRA_ARGS"
  recorder_args+=("${recorder_extra[@]}")
fi

recorder_log="$results_dir/recorder.log"
runner_log="$results_dir/runner.log"

cleanup() {
  if [[ -n "${recorder_pid:-}" ]]; then
    kill "$recorder_pid" >/dev/null 2>&1 || true
    wait "$recorder_pid" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

"$recorder_cmd" "${recorder_args[@]}" >"$recorder_log" 2>&1 &
recorder_pid=$!

set +e
"$runner_cmd" "${runner_args[@]}" >"$runner_log" 2>&1
runner_status=$?
set -e

cleanup
trap - EXIT

end_ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

REPORT_PATH="$report_path" \
RESULTS_DIR="$results_dir" \
TRACES_DIR="$traces_dir" \
SUITE_NAME="$suite_name" \
START_TS="$start_ts" \
END_TS="$end_ts" \
RUNNER_CMD="$runner_cmd" \
RECORDER_CMD="$recorder_cmd" \
node <<'NODE'
const fs = require('fs');
const path = require('path');

const reportPath = process.env.REPORT_PATH;
const resultsDir = process.env.RESULTS_DIR;
const tracesDir = process.env.TRACES_DIR;
const suiteName = process.env.SUITE_NAME;
const startTs = process.env.START_TS;
const endTs = process.env.END_TS;
const runnerCmd = process.env.RUNNER_CMD;
const recorderCmd = process.env.RECORDER_CMD;

const resultFiles = fs.existsSync(resultsDir)
  ? fs.readdirSync(resultsDir).filter((file) => file.endsWith('.json'))
  : [];

let summary = null;
let parsedFrom = null;

for (const file of resultFiles) {
  const fullPath = path.join(resultsDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    if (data?.summary) {
      summary = data.summary;
      parsedFrom = file;
      break;
    }
    if (Array.isArray(data?.results)) {
      const total = data.results.length;
      const passed = data.results.filter((item) => item.status === 'passed' || item.success === true).length;
      const failed = total - passed;
      summary = { total, passed, failed };
      parsedFrom = file;
      break;
    }
  } catch (error) {
    // Ignore parse errors for unrelated JSON files.
  }
}

const lines = [];
lines.push(`# ${suiteName} Report`);
lines.push('');
lines.push(`- Suite: ${suiteName}`);
lines.push(`- Started: ${startTs}`);
lines.push(`- Finished: ${endTs}`);
lines.push(`- Results directory: ${resultsDir}`);
lines.push(`- Traces directory: ${tracesDir}`);
lines.push(`- Runner command: \`${runnerCmd}\``);
lines.push(`- Recorder command: \`${recorderCmd}\``);
lines.push('');
lines.push('## Summary');
lines.push('');
if (summary) {
  const total = summary.total ?? summary.count ?? summary.totalCases;
  const passed = summary.passed ?? summary.success ?? summary.successes;
  const failed = summary.failed ?? summary.failures;
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Total cases | ${total ?? 'n/a'} |`);
  lines.push(`| Passed | ${passed ?? 'n/a'} |`);
  lines.push(`| Failed | ${failed ?? 'n/a'} |`);
  if (typeof total === 'number' && typeof passed === 'number' && total > 0) {
    const rate = ((passed / total) * 100).toFixed(2);
    lines.push(`| Success rate | ${rate}% |`);
  }
  if (parsedFrom) {
    lines.push('');
    lines.push(`Summary parsed from: \`${path.join(resultsDir, parsedFrom)}\``);
  }
} else {
  lines.push('No structured summary found in results JSON.');
}

lines.push('');
lines.push('## Result files');
lines.push('');
if (resultFiles.length === 0) {
  lines.push('- No JSON result files found.');
} else {
  for (const file of resultFiles) {
    lines.push(`- ${path.join(resultsDir, file)}`);
  }
}

fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
NODE

if [[ $runner_status -ne 0 ]]; then
  echo "Runner exited with status $runner_status. See $runner_log." >&2
  exit $runner_status
fi

echo "KineticBench run complete. Report: $report_path"
