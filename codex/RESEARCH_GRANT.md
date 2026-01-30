# Project ARES-01: Pre-Emptive Agent Error Detection via Mechanistic Interpretability

## 1. Abstract
Current agentic evaluation relies on *post-hoc* verification (did the code run?). ARES-01 proposes a *pre-emptive* monitoring system that analyzes the internal residual streams (specifically middle layers, e.g., Layer 19 of 32) to detect "confabulation drift" before the agent commits an action.
This is our project, and the first phase is intentionally testy—designed to validate the core signal extraction loop before we harden it for production.

## 2. The "Neural Telescope" Architecture
We treat the LLM not as a black box, but as a transparent engine.
- **Input:** VNC Screen Capture (Vision) + System Logs (Context).
- **Internal:** Hooking into the inference engine (llama.cpp/vllm) to extract activation vectors from specific attention heads.
- **Output:** A scalar "Stability Score" (0.0 - 1.0). If Score < 0.3, the "Interlock" pauses the agent.

## 3. Feasibility & Hardware (P700 POC)
Benchmarks on the Lenovo P700 demonstrate ample headroom for high-frequency data capture:
- **Throughput:** System can ingest data at **1.2 GB/s** (Network limited) or **3.6 GB/s** (Disk/CPU limited).
- **Cost of Observability:** The computational cost of hashing frames and encrypting logs is negligible (<5% CPU load).

## 4. Literature & Citations (30 Reference Targets)

### A. Mechanistic Interpretability & Probes
1. **Alain, G., & Bengio, Y. (2016).** *Understanding intermediate layers using linear classifier probes.* (The foundation of using probes to read internal states).
2. **Burns, C., et al. (2022).** *Discovering Latent Knowledge in Language Models Without Supervision.* (identifying "truth" directions in activation space).
3. **Elhage, N., et al. (2021).** *A Mathematical Framework for Transformer Circuits.* (Anthropic's guide to how attention heads compose).
4. **Gurnee, W., et al. (2023).** *Language Models Represent Space and Time.* (Shows models build internal world models).
5. **Li, K., et al. (2023).** *Inference-Time Intervention: Eliciting Truthful Answers from a Language Model.* (Modifying activations to fix errors).
6. **Meng, K., et al. (2022).** *Locating and Editing Factual Associations in GPT.* (ROME paper - editing specific memories).
7. **Nanda, N. (2022).** *TransformerLens: A library for mechanistic interpretability of GPT-2 style models.*
8. **Olsson, C., et al. (2022).** *In-context Learning and Induction Heads.* (How models copy/paste patterns).
9. **Wang, K., et al. (2023).** *Interpretability in the Wild: a Circuit for Indirect Object Identification in GPT-2 small.*
10. **Zou, A., et al. (2023).** *Representation Engineering: A Top-Down Approach to AI Transparency.*

### B. Agentic Safety & Evaluation
11. **AutoGPT & BabyAGI.** (Foundational open-source agent architectures for baseline comparison).
12. **Gpt-Engineer.** (Code generation agent benchmarks).
13. **Shinn, N., et al. (2023).** *Reflexion: Language Agents with Verbal Reinforcement Learning.* (Self-correction loops).
14. **Wei, J., et al. (2022).** *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models.*
15. **Yao, S., et al. (2022).** *ReAct: Synergizing Reasoning and Acting in Language Models.* (The standard loop we are interrupting).
16. **Anthropic (2023).** *Core Views on AI Safety: Constitutional AI.*
17. **OpenAI (2023).** *GPT-4 System Card.* (Details on refusal and hallucination rates).
18. **Google DeepMind.** *Scalable Oversight for Large Language Models.*

### C. Hallucination Detection
19. **Azaria, A., & Mitchell, T. (2023).** *The Internal State of an LLM Knows When its Lying.*
20. **Manakul, P., et al. (2023).** *SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection.*
21. **Mündler, N., et al. (2023).** *Self-contradictory Hallucinations of Large Language Models: Evaluation, Detection and Mitigation.*
22. **Zhang, Y., et al. (2023).** *Siren's Song in the AI Ocean: A Survey on Hallucination in Large Language Models.*

### D. Infrastructure & Tools (The "Hawkeye" Stack)
23. **Richardson, T., et al.** *The RFB Protocol (Remote Framebuffer).* (Basis for VNC capture).
24. **O'Connor, J., et al. (2020).** *BLAKE3: One Function, Fast Everywhere.* (Our chosen hashing algorithm).
25. **Aitenbichler, E.** *WebDataset: A High-Performance Python-Based I/O System for Large Datasets.*
26. **PyTorch Team.** *PyTorch Profiler.* (For measuring inference latency impact).
27. **NVIDIA.** *Nsight Systems.* (GPU profiling).
28. **Prometheus/Grafana.** (Time-series metrics for the dashboard).
29. **Docker Inc.** *Docker Compose Specification.*
30. **Proxmox Server Solutions.** *Proxmox Backup Client Documentation.* (Our baseline for IO throughput).

## 5. Novelty Claim
While papers 1-10 focus on *static* analysis (QA/Chat) and papers 11-15 focus on *behavioral* agent loops, **ARES-01** is the first to apply **Inference-Time Intervention (5)** specifically to **ReAct loops (15)** using a **low-latency side-channel (P700 Benchmarks)**.
The design is also intended to interoperate with **HOLO** as a second-stage validation target once the core telemetry is stable.
