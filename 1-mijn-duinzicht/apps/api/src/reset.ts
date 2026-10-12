import { ApiEnvironment }   from './ApiEnvironment';
import { bundledSeedPath }  from './adapters/seed/SeedIngestion';
import { createConsoleLog } from './services/log/createConsoleLog';
import { resetStore }       from './services/store/resetStore';

const FAILURE_EXIT_CODE = 1;

async function resetDevelopmentStore(): Promise<void> {
  const { databasePath, uploadDirectory } = ApiEnvironment;
  const resetVerdict = await resetStore({ databasePath, uploadDirectory, seedPath: bundledSeedPath() });
  if (resetVerdict.outcome === 'seedInvalid') {
    console.error(`The seed cannot be used:\n${resetVerdict.problems.join('\n')}`);
    process.exit(FAILURE_EXIT_CODE);
  }
  createConsoleLog()({ kind: 'storeReset', databasePath, uploadDirectory });
}

await resetDevelopmentStore();
