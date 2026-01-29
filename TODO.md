# TODO: Issue Remediation Checklist

## Local AI & On-Device Inference
- [ ] **CRITICAL:** Ensure local provider routing works end-to-end (bytebot-llm-proxy → local model) with tool calls and multi-turn flows.
- [ ] **CRITICAL:** Add validation for local model tool call IDs; reject missing IDs or generate deterministic IDs that round-trip.
- [ ] **HIGH:** Normalize local model schema constraints so enums (including numeric) survive schema conversion.
- [ ] **HIGH:** Verify local vision/image inputs accept expected base64/data URI formats.
- [ ] **MEDIUM:** Add structured error handling for local model JSON/tool argument parsing failures.
- [ ] **MEDIUM:** Cover local model streaming responses with tool calls (partial args, early aborts).
- [ ] **MEDIUM:** Validate local model empty content edge cases before formatting.
- [ ] **LOW:** Add input validation for empty messages in local-only flows.

## Local Consistency Improvements
- [ ] Standardize tool call ID handling across local model adapters.
- [ ] Add schema transformation layer that normalizes enum handling for local adapters.
- [ ] Normalize image handling (data URI vs base64) for local pipelines and document expectations.
- [ ] Normalize tool result image flow for local adapters (separate message vs inline).
- [ ] Standardize error handling/logging patterns using the proxy as reference.
- [ ] Add unit + integration tests covering tool IDs, enum handling, image blocks, and error scenarios for local models.

## Windows Desktop Reliability (OmniBox + Agent)
- [ ] **MEDIUM:** Investigate VSCode detection failures; compare successful vs failed trajectories, validate focus, and tune detection/waits.
- [ ] **LOW:** Add health monitoring for OmniBox + task monitoring/alerting for stuck tasks.
- [ ] Confirm task termination updates always set `completedAt` and `error` fields in production.
- [ ] Confirm trajectory recording is enabled in deployment environments.
- [ ] Validate Python execution error handling (returncode checks + stderr logging) in production.

## Desktop Troubleshooting Follow-ups
- [ ] Ensure OmniParser connectivity checks + logs are part of runbooks (Apple Silicon vs x86_64).
- [ ] Ensure Windows screenshots run in the user session (scheduled task uses user logon trigger, not system startup).
- [ ] Update omnibox-adapter to include `screenshotRegion()` support for region screenshots.
- [ ] Ensure `.env.defaults` is loaded so `BYTEBOT_DESKTOP_VNC_URL` is set for UI VNC.
- [ ] Verify GPU detection inside OmniParser container; rebuild if CUDA not detected.
- [ ] Perform Docker cleanup after Desktop restarts if builds are unstable (builder/image prune).

## Code Hygiene Checks (run after fixes)
- [ ] `npm run format --workspace bytebot-agent`
- [ ] `npm run format --workspace bytebot-agent-cc`
- [ ] `npm run format --workspace bytebotd`
- [ ] `npm run format --workspace omnibox-adapter`
- [ ] `npm run format --workspace shared`
- [ ] `npm run lint --workspace bytebot-ui`
- [ ] `npm test --workspace bytebot-agent`
- [ ] `npm run test:e2e --workspace bytebot-agent`
- [ ] `npm run test:cov --workspace bytebot-agent`
- [ ] `npm test --workspace bytebot-ui`

## Hygiene Review Batches
- [ ] Batch 1 (root + docker/ + helm/ + scripts/ + docs/ top-level) reviewed: `docs/hygiene-batch-1.md`.
