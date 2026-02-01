/**
 * Trajectory Distillation & Few-Shot Learning Types
 *
 * Types for recording, analyzing, and replaying task execution trajectories
 * to enable learning from successful Claude runs.
 */

import { TaskTrajectory, TrajectoryStep, FewShotExample } from '@prisma/client';
import { Coordinates } from '@bytebot/shared';

/**
 * Configuration for trajectory recording
 */
export interface TrajectoryRecordingConfig {
  /** Whether to record trajectories */
  enabled: boolean;
  /** Only record these model providers (empty = all) */
  modelProviders?: string[];
  /** Minimum task duration to record (seconds) */
  minDuration?: number;
  /** Whether to record failed tasks */
  recordFailures?: boolean;
}

/**
 * Configuration for few-shot learning
 */
export interface FewShotConfig {
  /** Whether to use few-shot learning */
  enabled: boolean;
  /** Number of examples to retrieve */
  count: number;
  /** Minimum similarity threshold (0.0-1.0) */
  similarityThreshold?: number;
  /** Only retrieve examples from these providers */
  sourceProviders?: string[];
}

/**
 * Snapshot of a single iteration for trajectory recording
 */
export interface IterationSnapshot {
  stepId: string;
  iterationNumber: number;
  systemPrompt: string;
  messages: any[]; // Message content blocks
  toolCalls?: any[]; // Tool use blocks
  toolResults?: any[]; // Tool result blocks
  reasoning?: string; // For o1/o3 models
  obsPre?: ObservationSnapshot | null;
  obsPost?: ObservationSnapshot | null;
  gridMetadata?: GridMetadata[];
  coordinateTelemetry?: CoordinateTelemetry[];
  replayMetadata?: ReplayMetadata;
  tokenUsage: {
    input: number;
    output: number;
  };
  timestamp: Date;
}

/**
 * Complete trajectory data for a task execution
 */
export interface TrajectoryData {
  taskId: string;
  modelProvider: string;
  modelName: string;
  success: boolean;
  startedAt: Date;
  completedAt?: Date;
  iterations: IterationSnapshot[];
  metrics: TrajectoryMetrics;
}

/**
 * Metrics calculated from trajectory execution
 */
export interface TrajectoryMetrics {
  iterationCount: number;
  toolCallsCount: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  errorRate: number; // 0.0-1.0
  clickAccuracy?: number; // 0.0-1.0
  userInterventions: number;
  qualityScore?: number; // 0.0-1.0
}

/**
 * Condensed few-shot example for prompt injection
 */
export interface CondensedExample {
  taskDescription: string;
  keySteps: string[];
  toolsUsed: string[];
  outcome: string;
  reasoning?: string;
}

/**
 * Similar trajectory result from search
 */
export interface SimilarTrajectory {
  trajectory: TaskTrajectory & {
    steps: TrajectoryStep[];
  };
  similarity: number; // Cosine similarity score
  condensedExample: CondensedExample;
}

/**
 * Search parameters for finding similar trajectories
 */
export interface TrajectorySearchParams {
  taskDescription: string;
  topK?: number;
  minSimilarity?: number;
  modelProvider?: string;
  successOnly?: boolean;
  minQuality?: number;
}

export type FailureTaxonomyLabel =
  | 'grounding_error'
  | 'ui_drift'
  | 'instruction_ambiguity'
  | 'privilege_boundary'
  | 'evaluator_mismatch';

export interface FailureTaxonomyDefinition {
  label: FailureTaxonomyLabel;
  description: string;
}

export interface FailureSummary {
  totalFailed: number;
  byLabel: Record<FailureTaxonomyLabel, number>;
}

/**
 * Export format for fine-tuning
 */
export interface TrajectoryExport {
  format: 'openai' | 'gemini' | 'anthropic';
  trajectories: ExportedTrajectory[];
  metadata: {
    exportDate: Date;
    totalTrajectories: number;
    successRate: number;
    averageQuality: number;
    failureTaxonomy?: FailureTaxonomyDefinition[];
    failureSummary?: FailureSummary;
  };
}

/**
 * Single exported trajectory in fine-tuning format
 */
export interface ExportedTrajectory {
  messages: any[]; // Format-specific message structure
  metadata: {
    taskId: string;
    modelProvider: string;
    success: boolean;
    qualityScore?: number;
    failureLabels?: FailureTaxonomyLabel[];
    failureReason?: string | null;
  };
  replay?: ReplayExportMetadata;
}

/**
 * Quality scoring criteria
 */
export interface QualityScoreFactors {
  taskCompleted: boolean; // Base requirement
  noUserInterventions: boolean; // No takeover needed
  efficientExecution: boolean; // Low iteration count
  highClickAccuracy: boolean; // >80% click success
  lowErrorRate: boolean; // <10% tool errors
}

/**
 * Trajectory with related data
 */
export type TrajectoryWithRelations = TaskTrajectory & {
  steps: TrajectoryStep[];
  task: {
    id: string;
    description: string;
    status: string;
    error?: string | null;
  };
};

export interface ObservationSnapshot {
  image?: string;
  offset?: { x: number; y: number };
  region?: { x: number; y: number; width: number; height: number };
  zoomLevel?: number;
  gridOverlay?: boolean | null;
  gridSize?: number | null;
  timestamp: Date;
  source: 'tool_result' | 'history' | 'none';
}

export interface GridMetadata {
  toolUseId: string;
  action: string;
  gridOverlay?: boolean | null;
  gridSize?: number | null;
  region?: { x: number; y: number; width: number; height: number } | null;
  offset?: { x: number; y: number } | null;
  zoomLevel?: number | null;
  includeOffset?: boolean | null;
}

export interface CoordinateTelemetry {
  toolUseId: string;
  action: string;
  coordinates?: Coordinates | null;
  fallbackCoordinates?: Coordinates | null;
  elementId?: string | null;
  description?: string | null;
}

export interface ReplayActionMetadata {
  toolUseId: string;
  action: string;
  obsPre: ObservationSnapshot | null;
  obsPost: ObservationSnapshot | null;
  gridMetadata?: GridMetadata | null;
  coordinateTelemetry?: CoordinateTelemetry | null;
}

export interface ReplayMetadata {
  stepId: string;
  iterationNumber: number;
  actions: ReplayActionMetadata[];
}

export interface ReplayExportMetadata {
  trajectoryId: string;
  taskId: string;
  steps: ReplayMetadata[];
}

/**
 * Few-shot example with usage stats
 */
export type FewShotExampleWithStats = FewShotExample & {
  trajectory: {
    modelProvider: string;
    modelName: string;
    qualityScore: number | null;
  };
};
