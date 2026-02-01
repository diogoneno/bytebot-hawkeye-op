import { runTask } from '../src/benchmarks/kineticbench-5/runner';

async function main() {
  const [taskId, outputBaseDir] = process.argv.slice(2);

  if (!taskId) {
    console.error('Usage: ts-node run-kineticbench-task.ts <task_id> [output_dir]');
    process.exit(1);
  }

  try {
    const result = await runTask(taskId, {
      outputBaseDir,
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to run task ${taskId}: ${message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Unexpected error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
