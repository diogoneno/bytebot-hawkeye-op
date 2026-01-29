# Hygiene Review Batch 1 (Root + docker/ + helm/ + scripts/ + docs/ top-level)

Scope: repo root files plus top-level files in `docker/`, `helm/`, `scripts/`, and `docs/` (excluding `docs/archive/`, `packages/`, `tests/`, `static/`, and `config/`). This batch is intentionally capped under 200 items.

## Review Table
| # | Path | Verdict | Rationale |
| --- | --- | --- | --- |
| 1 | .gitattributes | KEEP | Repo-wide Git settings; required for consistent behavior. |
| 2 | .gitignore | KEEP | Prevents committing build artifacts and secrets. |
| 3 | .prettierignore | KEEP | Needed for formatting hygiene. |
| 4 | AGENTS.md | KEEP | Repository workflow and contribution guidelines. |
| 5 | AI_PROVIDER_INTEGRATION_ANALYSIS.md | REVIEW | Architecture notes; validate if still accurate or superseded by newer docs. |
| 6 | CLAUDE.md | REVIEW | Likely historical guidance; confirm relevance to current workflows. |
| 7 | CLEANUP_SUMMARY.md | REVIEW | Cleanup notes may be stale; verify if still needed. |
| 8 | CUDA_GPU_FIX.md | REVIEW | GPU fix guidance; check if absorbed into current setup docs. |
| 9 | CV_VISIBILITY_IMPLEMENTATION_GUIDE.md | REVIEW | Implementation guide; confirm current relevance and update location if needed. |
| 10 | DOCKER_FIX.md | REVIEW | Historical fix summary; validate against current docker stack. |
| 11 | FIXES_IMPLEMENTED.md | REVIEW | Historical record; may be stale. |
| 12 | LICENSE | KEEP | Required legal file. |
| 13 | PROVIDER_ANALYSIS_INDEX.md | REVIEW | Provider analysis index; check if still used or needs consolidation. |
| 14 | PROVIDER_ANALYSIS_SUMMARY.txt | REVIEW | Summary appears legacy; confirm usage. |
| 15 | PROVIDER_BUGS_DETAILED.md | REVIEW | Diagnostic report; verify current relevance. |
| 16 | README-EXPERIMENTAL.md | REVIEW | Experimental doc; confirm if still supported. |
| 17 | README.md | KEEP | Primary entry point documentation. |
| 18 | REBUILD_CUDA.md | REVIEW | Potentially redundant with GPU setup docs. |
| 19 | TODO.md | KEEP | Active remediation and hygiene checklist. |
| 20 | WINDOWS_DESKTOP_DIAGNOSTIC_REPORT.md | REVIEW | Diagnostic report; verify if still used. |
| 21 | docker/.env.defaults | KEEP | Default env placeholders; needed for local setup. |
| 22 | docker/.env.example | KEEP | Example env file for onboarding. |
| 23 | docker/README-ARCHITECTURE.md | KEEP | Docker stack architecture reference. |
| 24 | docker/bytebot-desktop.Dockerfile | KEEP | Core container build file. |
| 25 | docker/docker-compose-claude-code.yml | REVIEW | Optional stack; confirm current usage. |
| 26 | docker/docker-compose.core.yml | KEEP | Core stack definition. |
| 27 | docker/docker-compose.development.yml | KEEP | Development stack definition. |
| 28 | docker/docker-compose.gpu.yml | KEEP | GPU stack definition. |
| 29 | docker/docker-compose.omniparser.yml | KEEP | OmniParser stack definition. |
| 30 | docker/docker-compose.override.yml | REVIEW | Confirm required overrides still match deployments. |
| 31 | docker/docker-compose.proxy.yml | KEEP | LLM proxy stack definition. |
| 32 | docker/docker-compose.yml | KEEP | Primary docker compose entry point. |
| 33 | docs/GPU_FIX_SUMMARY.md | REVIEW | May be superseded by GPU setup docs. |
| 34 | docs/GPU_SETUP.md | KEEP | Active GPU setup instructions. |
| 35 | docs/LMSTUDIO_INTEGRATION.md | KEEP | Local model integration guide. |
| 36 | docs/MODEL_LEARNING_SYSTEM.md | REVIEW | Validate relevance to current system. |
| 37 | docs/OLLAMA_INTEGRATION.md | KEEP | Local model integration guide. |
| 38 | docs/OMNIBOX_QUICK_START.md | KEEP | Omnibox onboarding doc. |
| 39 | docs/OMNIBOX_WINDOWS_INTEGRATION.md | KEEP | Windows integration reference. |
| 40 | docs/OMNIPARSER_AUDIT.md | REVIEW | Audit doc; check for staleness. |
| 41 | docs/OMNIPARSER_FULL_INTEGRATION_COMPLETE.md | REVIEW | Legacy completion report; likely stale. |
| 42 | docs/SMART_FOCUS_SYSTEM.md | REVIEW | Confirm system still matches behavior. |
| 43 | docs/SOM_IMPLEMENTATION_STATUS.md | REVIEW | Status doc; confirm current relevance. |
| 44 | docs/computer-user-models.md | KEEP | Core product concept documentation. |
| 45 | docs/docs.json | KEEP | Docs site config metadata. |
| 46 | docs/favicon.svg | KEEP | Docs site asset. |
| 47 | docs/file-storage-migration.md | REVIEW | Migration note; check if still actionable. |
| 48 | docs/introduction.mdx | KEEP | Docs site introduction. |
| 49 | docs/opencv-build-guide.md | KEEP | OpenCV build instructions. |
| 50 | docs/quickstart.mdx | KEEP | Primary docs quickstart. |
| 51 | helm/Chart.yaml | KEEP | Helm chart metadata. |
| 52 | helm/README.md | KEEP | Helm deployment instructions. |
| 53 | helm/values-proxy.yaml | KEEP | Helm values for proxy deployment. |
| 54 | helm/values-simple.yaml | KEEP | Simplified helm values. |
| 55 | helm/values.yaml | KEEP | Default helm values. |
| 56 | package-lock.json | KEEP | Dependency lockfile. |
| 57 | package.json | KEEP | Workspace root definition. |
| 58 | screenshot.png | REVIEW | Likely leftover artifact; verify if still needed. |
| 59 | scripts/README.md | KEEP | Scripts overview. |
| 60 | scripts/check-gpu-support.sh | KEEP | GPU sanity check script. |
| 61 | scripts/diagnose-cuda.sh | KEEP | CUDA diagnostics. |
| 62 | scripts/download-windows-iso.sh | REVIEW | Confirm current usage and policy. |
| 63 | scripts/fresh-build.sh | KEEP | Clean build helper. |
| 64 | scripts/manage-omnibox.sh | KEEP | OmniBox ops helper. |
| 65 | scripts/monitor-omnibox.sh | KEEP | OmniBox monitoring helper. |
| 66 | scripts/ollama-vision-models.txt | REVIEW | Data list; verify current usage. |
| 67 | scripts/setup-lmstudio.sh | KEEP | LMStudio setup helper. |
| 68 | scripts/setup-ollama.sh | KEEP | Ollama setup helper. |
| 69 | scripts/setup-omnibox.sh | KEEP | OmniBox setup helper. |
| 70 | scripts/setup-omniparser.sh | KEEP | OmniParser setup helper. |
| 71 | scripts/setup-trajectory-db.sh | KEEP | Trajectory DB setup helper. |
| 72 | scripts/start-omniparser.sh | KEEP | OmniParser start helper. |
| 73 | scripts/start-stack.sh | KEEP | Stack start orchestration. |
| 74 | scripts/start.sh | KEEP | General start helper. |
| 75 | scripts/stop-omniparser.sh | KEEP | OmniParser stop helper. |
| 76 | scripts/stop-stack.sh | KEEP | Stack stop orchestration. |

## Notes & Next Actions
- Items marked REVIEW should be validated against current operations or consolidated into more canonical docs. If they are stale, archive or remove with replacement notes.
- Next batch proposed: service packages (`packages/bytebot-agent`, `bytebotd`, `bytebot-ui`, `bytebot-llm-proxy`, `bytebot-cv`, `omnibox*`).
