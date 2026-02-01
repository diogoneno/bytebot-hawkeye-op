# Trace Event Schema

This document defines the JSONL trace event format used to record agent runs. Each line in a trace file is a JSON object representing one event.

## Required Fields (All Events)

Every event **must** include the following fields:

| Field | Type | Description |
| --- | --- | --- |
| `event_type` | `string` | Event discriminator. Must be one of `step_start`, `step_end`, `obs_pre`, `action`, `obs_post`, `outcome`, `errors`. |
| `run_id` | `string` | Unique identifier for the run. |
| `episode_id` | `string` | Identifier for the episode within the run. |
| `step_id` | `integer` | Step index within the episode. |
| `vm_snapshot_id` | `string` | Snapshot identifier for the VM state. |
| `task_id` | `string` | Identifier for the task. |
| `seed` | `integer` | Random seed used for the run. |

Additional fields may be included as needed per event type (examples below).

## Event Type Guidance

| Event Type | Common Additional Fields | Description |
| --- | --- | --- |
| `step_start` | `timestamp`, `metadata` | Marks the start of a step. |
| `step_end` | `timestamp`, `duration_ms` | Marks the end of a step. |
| `obs_pre` | `observation`, `timestamp` | Pre-action observation. |
| `action` | `action`, `timestamp` | Action taken at this step. |
| `obs_post` | `observation`, `timestamp` | Post-action observation. |
| `outcome` | `result`, `reward`, `timestamp` | Final outcome for the episode/run. |
| `errors` | `error`, `stack`, `timestamp` | Error details when a step fails. |

## JSON Schema (Draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://bytebot.ai/schemas/trace-event.json",
  "title": "Bytebot Trace Event",
  "type": "object",
  "required": [
    "event_type",
    "run_id",
    "episode_id",
    "step_id",
    "vm_snapshot_id",
    "task_id",
    "seed"
  ],
  "properties": {
    "event_type": {
      "type": "string",
      "enum": [
        "step_start",
        "step_end",
        "obs_pre",
        "action",
        "obs_post",
        "outcome",
        "errors"
      ]
    },
    "run_id": { "type": "string" },
    "episode_id": { "type": "string" },
    "step_id": { "type": "integer", "minimum": 0 },
    "vm_snapshot_id": { "type": "string" },
    "task_id": { "type": "string" },
    "seed": { "type": "integer" },
    "timestamp": { "type": "number" },
    "metadata": { "type": "object" },
    "observation": { "type": ["object", "string"] },
    "action": { "type": ["object", "string"] },
    "duration_ms": { "type": "number" },
    "result": { "type": ["object", "string"] },
    "reward": { "type": "number" },
    "error": { "type": ["object", "string"] },
    "stack": { "type": "string" }
  },
  "additionalProperties": true
}
```

## Validation

Use `node scripts/validate-trace.js <path-to-trace.jsonl>` to validate each event in a JSONL file against the required fields and event type enum.
