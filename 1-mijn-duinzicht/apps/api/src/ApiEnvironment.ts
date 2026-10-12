import { resolve } from 'node:path';

export type EnvironmentSetting<Value> =
  | { readonly outcome: 'valid'; readonly value: Value }
  | { readonly outcome: 'invalid'; readonly variableName: string; readonly problem: string };

const API_PORT_VARIABLE = 'DUINZICHT_API_PORT';
const DATABASE_PATH_VARIABLE = 'DUINZICHT_DATABASE_PATH';
const UPLOAD_DIRECTORY_VARIABLE = 'DUINZICHT_UPLOAD_DIRECTORY';
const DEFAULT_API_PORT = 3001;
const LOWEST_API_PORT = 0;
const HIGHEST_PORT = 65_535;
const PORT_PATTERN = /^\d+$/;
const DEVELOPMENT_DATA_DIRECTORY = '.data';
const DEFAULT_DATABASE_FILE_NAME = 'portal.sqlite';
const DEFAULT_UPLOAD_DIRECTORY_NAME = 'uploads';

function configuredValueOf(variableName: string): string | undefined {
  const configuredValue = process.env[variableName];
  return configuredValue === '' ? undefined : configuredValue;
}

function repositoryRoot(): string {
  return resolve(import.meta.dir, '..', '..', '..');
}

/** A relative path resolves against the repository root, because `bun --filter` runs each workspace in its own directory. */
function pathFor(variableName: string, defaultSegments: readonly string[]): string {
  const configuredPath = configuredValueOf(variableName);
  return configuredPath === undefined ? resolve(repositoryRoot(), ...defaultSegments) : resolve(repositoryRoot(), configuredPath);
}

export const ApiEnvironment = {
  /** Overrides port 3001 so parallel worktrees each run their own API; 0 lets the system choose a free port, as the start-up specs do. */
  get apiPort(): EnvironmentSetting<number> {
    const configuredValue = configuredValueOf(API_PORT_VARIABLE);
    if (configuredValue === undefined) {
      return { outcome: 'valid', value: DEFAULT_API_PORT };
    }
    const port = Number(configuredValue);
    if (PORT_PATTERN.test(configuredValue) && port >= LOWEST_API_PORT && port <= HIGHEST_PORT) {
      return { outcome: 'valid', value: port };
    }
    return {
      outcome:      'invalid',
      variableName: API_PORT_VARIABLE,
      problem:      `${API_PORT_VARIABLE} must be a whole number from ${LOWEST_API_PORT} to ${HIGHEST_PORT}, but is "${configuredValue}".`,
    };
  },

  /** Overrides `<repository>/.data/portal.sqlite` so worktrees and scratch servers never share the development store. */
  get databasePath(): string {
    return pathFor(DATABASE_PATH_VARIABLE, [DEVELOPMENT_DATA_DIRECTORY, DEFAULT_DATABASE_FILE_NAME]);
  },

  /** Overrides `<repository>/.data/uploads` for the same reason as the database path. */
  get uploadDirectory(): string {
    return pathFor(UPLOAD_DIRECTORY_VARIABLE, [DEVELOPMENT_DATA_DIRECTORY, DEFAULT_UPLOAD_DIRECTORY_NAME]);
  },
};
