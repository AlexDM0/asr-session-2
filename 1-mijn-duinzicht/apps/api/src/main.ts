import { ApiEnvironment }          from './ApiEnvironment';
import { bundledSeedPath }         from './adapters/seed/SeedIngestion';
import { currentStructureVersion } from './adapters/store/migrations/storeMigrations';
import { createApiServer }         from './createApiServer';
import { createConsoleLog }        from './services/log/createConsoleLog';
import { createPortalStore }       from './services/store/PortalStore';
import { prepareStore }            from './services/store/prepareStore';

const FAILURE_EXIT_CODE = 1;

function exitWithProblem(problem: string): never {
  console.error(problem);
  process.exit(FAILURE_EXIT_CODE);
}

async function startApi(): Promise<void> {
  const log = createConsoleLog();
  const portSetting = ApiEnvironment.apiPort;
  if (portSetting.outcome === 'invalid') {
    exitWithProblem(portSetting.problem);
  }
  const { databasePath, uploadDirectory } = ApiEnvironment;

  const preparedVerdict = await prepareStore({ databasePath, seedPath: bundledSeedPath() });
  if (preparedVerdict.outcome === 'unreadable' || preparedVerdict.outcome === 'versionMismatch') {
    log({
      kind:            'storeRefused',
      databasePath,
      problem:         preparedVerdict.outcome,
      foundVersion:    preparedVerdict.outcome === 'versionMismatch' ? preparedVerdict.foundVersion : null,
      expectedVersion: currentStructureVersion(),
    });
    process.exit(FAILURE_EXIT_CODE);
  }
  if (preparedVerdict.outcome === 'seedInvalid') {
    exitWithProblem(`The seed cannot be used:\n${preparedVerdict.problems.join('\n')}`);
  }
  if (preparedVerdict.outcome === 'created') {
    log({ kind: 'storeCreated', databasePath });
  }

  const serverVerdict = createApiServer({ context: { store: createPortalStore(databasePath), uploadDirectory, log }, port: portSetting.value });
  if (serverVerdict.outcome === 'duplicateRoute') {
    exitWithProblem(`The path ${serverVerdict.path} is declared twice for ${serverVerdict.method}.`);
  }
  log({ kind: 'apiStarted', origin: `http://localhost:${serverVerdict.server.port}` });
}

await startApi();
