import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { getKineticBenchTask, loadKineticBenchRegistry } from './registry';
import {
  RunTaskMetrics,
  RunTaskResult,
  RunTaskTuple,
  RunTaskVerdict,
} from './types';

const prisma = new PrismaClient();

type RunTaskOptions = {
  outputBaseDir?: string;
};

function buildOutputDir(taskId: string, outputBaseDir?: string): string {
  const baseDir =
    outputBaseDir || path.resolve(process.cwd(), 'runs', 'kineticbench-5');
  return path.join(baseDir, taskId);
}

function buildVerdict(success: boolean | null): RunTaskVerdict {
  if (success === null) {
    return 'error';
  }

  return success ? 'pass' : 'fail';
}

function buildMetrics(
  trajectory: {
    startedAt: Date;
    completedAt: Date | null;
    iterationCount: number;
    toolCallsCount: number;
    tokenUsageInput: number;
    tokenUsageOutput: number;
    tokenUsageTotal: number;
    errorRate: number;
    clickAccuracy: number | null;
    userInterventions: number;
    qualityScore: number | null;
  },
): RunTaskMetrics {
  const durationSeconds =
    trajectory.completedAt && trajectory.startedAt
      ? (trajectory.completedAt.getTime() - trajectory.startedAt.getTime()) /
        1000
      : null;

  return {
    durationSeconds,
    iterationCount: trajectory.iterationCount,
    toolCallsCount: trajectory.toolCallsCount,
    tokenUsage: {
      input: trajectory.tokenUsageInput,
      output: trajectory.tokenUsageOutput,
      total: trajectory.tokenUsageTotal,
    },
    errorRate: trajectory.errorRate,
    clickAccuracy: trajectory.clickAccuracy ?? undefined,
    userInterventions: trajectory.userInterventions,
    qualityScore: trajectory.qualityScore ?? undefined,
  };
}

async function writeReport(
  outputDir: string,
  taskSummary: {
    id: string;
    name: string;
    description: string;
    expectedOutcome?: string;
  },
  verdict: RunTaskVerdict,
  metrics: RunTaskMetrics,
  tracePath: string,
): Promise<void> {
  const reportLines = [
    `# KineticBench-5 Task Report`,
    ``,
    `## Task`,
    `- **ID:** ${taskSummary.id}`,
    `- **Name:** ${taskSummary.name}`,
    `- **Description:** ${taskSummary.description}`,
  ];

  if (taskSummary.expectedOutcome) {
    reportLines.push(`- **Expected Outcome:** ${taskSummary.expectedOutcome}`);
  }

  reportLines.push(
    ``,
    `## Verdict`,
    `- **Result:** ${verdict}`,
    ``,
    `## Metrics`,
    `- **Duration (s):** ${metrics.durationSeconds ?? 'n/a'}`,
    `- **Iterations:** ${metrics.iterationCount}`,
    `- **Tool Calls:** ${metrics.toolCallsCount}`,
    `- **Token Usage (input/output/total):** ${metrics.tokenUsage.input}/${metrics.tokenUsage.output}/${metrics.tokenUsage.total}`,
    `- **Error Rate:** ${metrics.errorRate}`,
    `- **Click Accuracy:** ${metrics.clickAccuracy ?? 'n/a'}`,
    `- **User Interventions:** ${metrics.userInterventions}`,
    `- **Quality Score:** ${metrics.qualityScore ?? 'n/a'}`,
    ``,
    `## Trace`,
    `- **Trace Path:** ${tracePath}`,
  );

  await fs.writeFile(
    path.join(outputDir, 'report.md'),
    `${reportLines.join('\n')}\n`,
    'utf8',
  );
}

export async function runTask(
  taskId: string,
  options: RunTaskOptions = {},
): Promise<RunTaskResult> {
  try {
    const registry = await loadKineticBenchRegistry();
    const task = getKineticBenchTask(registry, taskId);

    if (!task) {
      throw new Error(`Unknown KineticBench-5 task ID: ${taskId}`);
    }

    const trajectory = await prisma.taskTrajectory.findUnique({
      where: { taskId },
      include: {
        steps: {
          orderBy: { iterationNumber: 'asc' },
        },
        task: {
          select: {
            description: true,
            status: true,
          },
        },
      },
    });

    if (!trajectory) {
      throw new Error(`No recorded trajectory found for task ID: ${taskId}`);
    }

    const outputDir = buildOutputDir(taskId, options.outputBaseDir);
    await fs.mkdir(outputDir, { recursive: true });

    const tracePath = path.join(outputDir, 'trace.json');
    const tracePayload = {
      benchmark: registry.benchmark,
      registryVersion: registry.version,
      task,
      trajectory: {
        id: trajectory.id,
        taskId: trajectory.taskId,
        modelProvider: trajectory.modelProvider,
        modelName: trajectory.modelName,
        success: trajectory.success,
        qualityScore: trajectory.qualityScore,
        startedAt: trajectory.startedAt,
        completedAt: trajectory.completedAt,
        metrics: {
          iterationCount: trajectory.iterationCount,
          toolCallsCount: trajectory.toolCallsCount,
          tokenUsage: {
            input: trajectory.tokenUsageInput,
            output: trajectory.tokenUsageOutput,
            total: trajectory.tokenUsageTotal,
          },
          errorRate: trajectory.errorRate,
          clickAccuracy: trajectory.clickAccuracy,
          userInterventions: trajectory.userInterventions,
        },
        steps: trajectory.steps.map((step) => ({
          iterationNumber: step.iterationNumber,
          systemPrompt: step.systemPrompt,
          messagesSnapshot: step.messagesSnapshot,
          toolCalls: step.toolCalls,
          toolResults: step.toolResults,
          reasoning: step.reasoning,
          tokenUsageInput: step.tokenUsageInput,
          tokenUsageOutput: step.tokenUsageOutput,
          timestamp: step.timestamp,
        })),
        taskStatus: trajectory.task?.status,
        taskDescription: trajectory.task?.description,
      },
    };

    await fs.writeFile(tracePath, JSON.stringify(tracePayload, null, 2), 'utf8');

    const metrics = buildMetrics({
      startedAt: trajectory.startedAt,
      completedAt: trajectory.completedAt,
      iterationCount: trajectory.iterationCount,
      toolCallsCount: trajectory.toolCallsCount,
      tokenUsageInput: trajectory.tokenUsageInput,
      tokenUsageOutput: trajectory.tokenUsageOutput,
      tokenUsageTotal: trajectory.tokenUsageTotal,
      errorRate: trajectory.errorRate,
      clickAccuracy: trajectory.clickAccuracy,
      userInterventions: trajectory.userInterventions,
      qualityScore: trajectory.qualityScore,
    });

    const verdict = buildVerdict(trajectory.success);
    const resultsPayload = {
      benchmark: registry.benchmark,
      registryVersion: registry.version,
      taskId,
      tracePath,
      trace_path: tracePath,
      verdict,
      metrics,
      generatedAt: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(outputDir, 'results.json'),
      JSON.stringify(resultsPayload, null, 2),
      'utf8',
    );

    await writeReport(
      outputDir,
      {
        id: task.id,
        name: task.name,
        description: task.description,
        expectedOutcome: task.expectedOutcome,
      },
      verdict,
      metrics,
      tracePath,
    );

    return {
      tracePath,
      verdict,
      metrics,
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function run_task(
  taskId: string,
  options: RunTaskOptions = {},
): Promise<RunTaskTuple> {
  const result = await runTask(taskId, options);
  return [result.tracePath, result.verdict, result.metrics];
}
