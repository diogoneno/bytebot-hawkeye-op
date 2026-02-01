# Trace/Evaluator Metrics Report

Generated: 2026-02-01T12:04:24.050Z

## Definitions
- **flagged_step_rate**: Portion of trace steps flagged by safety/evaluator signals (flagged steps ÷ total steps).
- **block_rate**: Portion of trace steps blocked by policy decisions (blocked steps ÷ total steps).
- **override_rate**: Portion of trace steps that required overrides (overridden steps ÷ total steps).
- **false_flag_rate**: Portion of evaluated flags that were marked false positives (false flags ÷ evaluated flags). Only computed when evaluator outputs include explicit false/true flag verdicts.

## Inputs
- Trace files (0): None found
- Evaluator files (0): None found
- Missing trace paths: outputs/trace
- Missing evaluator paths: outputs/evaluator

## Metrics
| Metric | Value | Numerator | Denominator |
| --- | --- | --- | --- |
| flagged_step_rate | N/A | 0 | 0 |
| block_rate | N/A | 0 | 0 |
| override_rate | N/A | 0 | 0 |
| false_flag_rate | N/A | 0 | 0 |

## Notes
- Total steps are derived from trace outputs (steps, iterations, or event entries).
- Evaluated flags are derived from evaluator outputs that provide explicit true/false flag verdicts.
- Parsing errors: None
