export interface KineticBenchTask {
  id: string;
  name: string;
  description: string;
  expectedOutcome?: string;
  metadata?: Record<string, unknown>;
}

export interface KineticBenchRegistry {
  benchmark: 'KineticBench-5';
  version: string;
  tasks: KineticBenchTask[];
}

export interface RunTaskMetrics {
  durationSeconds: number | null;
  iterationCount: number;
  toolCallsCount: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  errorRate: number;
  clickAccuracy?: number;
  userInterventions: number;
  qualityScore?: number | null;
}

export type RunTaskVerdict = 'pass' | 'fail' | 'error';

export interface RunTaskResult {
  tracePath: string;
  verdict: RunTaskVerdict;
  metrics: RunTaskMetrics;
}

export type RunTaskTuple = [string, RunTaskVerdict, RunTaskMetrics];
