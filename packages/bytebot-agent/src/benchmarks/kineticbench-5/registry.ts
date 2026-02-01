import { promises as fs } from 'fs';
import path from 'path';
import { KineticBenchRegistry, KineticBenchTask } from './types';

const defaultRegistry: KineticBenchRegistry = {
  benchmark: 'KineticBench-5',
  version: '5.0',
  tasks: [
    {
      id: 'kb5-001',
      name: 'Launch notes app',
      description: 'Open the system Notes application and create a new note titled "KineticBench".',
      expectedOutcome: 'A new note titled "KineticBench" exists in the Notes app.',
      metadata: {
        domain: 'desktop',
      },
    },
    {
      id: 'kb5-002',
      name: 'Check system settings',
      description: 'Open System Settings and navigate to the Network pane.',
      expectedOutcome: 'The Network settings pane is visible on screen.',
      metadata: {
        domain: 'desktop',
      },
    },
  ],
};

const registryEnvVar = 'KINETICBENCH5_REGISTRY_PATH';
const defaultRegistryPath = path.resolve(
  process.cwd(),
  'config',
  'kineticbench-5',
  'registry.json',
);

export async function loadKineticBenchRegistry(): Promise<KineticBenchRegistry> {
  const registryPath = process.env[registryEnvVar] || defaultRegistryPath;

  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    const parsed = JSON.parse(raw) as KineticBenchRegistry;

    if (parsed.benchmark !== 'KineticBench-5') {
      throw new Error(
        `Registry ${registryPath} is not a KineticBench-5 registry.`,
      );
    }

    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return defaultRegistry;
}

export function getKineticBenchTask(
  registry: KineticBenchRegistry,
  taskId: string,
): KineticBenchTask | undefined {
  return registry.tasks.find((task) => task.id === taskId);
}
