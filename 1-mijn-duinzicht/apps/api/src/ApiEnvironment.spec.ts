/**
 * The environment module decides which port and which store the API uses, so the cases that matter
 * are the defaults (each worktree gets its own `.data/`), that every getter reads the variable when
 * called rather than at import, and that an invalid port is refused instead of guessed.
 */
import { tmpdir }              from 'node:os';
import { isAbsolute, resolve } from 'node:path';
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'bun:test';

import { ApiEnvironment } from './ApiEnvironment';

const VARIABLE_NAMES = ['DUINZICHT_API_PORT', 'DUINZICHT_DATABASE_PATH', 'DUINZICHT_UPLOAD_DIRECTORY'] as const;
const originalValues = new Map<string, string | undefined>();

function repositoryRoot(): string {
  return resolve(import.meta.dir, '..', '..', '..');
}

beforeAll(() => {
  for (const variableName of VARIABLE_NAMES) {
    originalValues.set(variableName, process.env[variableName]);
  }
});

afterEach(() => {
  for (const [variableName, originalValue] of originalValues) {
    if (originalValue === undefined) {
      delete process.env[variableName];
    } else {
      process.env[variableName] = originalValue;
    }
  }
});

function clearVariables(): void {
  for (const variableName of VARIABLE_NAMES) {
    delete process.env[variableName];
  }
}

describe('ApiEnvironment.apiPort', () => {
  it('defaults to 3001 when the variable is unset or empty', () => {
    clearVariables();
    expect(ApiEnvironment.apiPort).toEqual({ outcome: 'valid', value: 3001 });

    process.env['DUINZICHT_API_PORT'] = '';
    expect(ApiEnvironment.apiPort).toEqual({ outcome: 'valid', value: 3001 });
  });

  it('reads the variable each time it is asked, never a snapshot taken at import', () => {
    process.env['DUINZICHT_API_PORT'] = '4100';
    expect(ApiEnvironment.apiPort).toEqual({ outcome: 'valid', value: 4100 });

    process.env['DUINZICHT_API_PORT'] = '4200';
    expect(ApiEnvironment.apiPort).toEqual({ outcome: 'valid', value: 4200 });
  });

  it('accepts the highest port 65535 and port 0, which lets the system choose a free port', () => {
    process.env['DUINZICHT_API_PORT'] = '65535';
    expect(ApiEnvironment.apiPort).toEqual({ outcome: 'valid', value: 65535 });

    process.env['DUINZICHT_API_PORT'] = '0';
    expect(ApiEnvironment.apiPort).toEqual({ outcome: 'valid', value: 0 });
  });

  it('refuses a port above 65535, a negative or fractional number and text, naming the variable', () => {
    for (const invalidValue of ['65536', '-1', '3001.5', 'example', ' 3001']) {
      process.env['DUINZICHT_API_PORT'] = invalidValue;

      const setting = ApiEnvironment.apiPort;

      expect(setting.outcome).toBe('invalid');
      expect(setting.outcome === 'invalid' && setting.problem).toContain('DUINZICHT_API_PORT');
    }
  });
});

describe('ApiEnvironment store locations', () => {
  it('defaults the database to .data/portal.sqlite under the repository root, as an absolute path', () => {
    clearVariables();

    expect(ApiEnvironment.databasePath).toBe(resolve(repositoryRoot(), '.data', 'portal.sqlite'));
    expect(isAbsolute(ApiEnvironment.databasePath)).toBe(true);
  });

  it('defaults the upload directory to .data/uploads under the repository root, as an absolute path', () => {
    clearVariables();

    expect(ApiEnvironment.uploadDirectory).toBe(resolve(repositoryRoot(), '.data', 'uploads'));
    expect(isAbsolute(ApiEnvironment.uploadDirectory)).toBe(true);
  });

  it('uses an absolute override as given', () => {
    // Built from the platform's own temporary directory, so the path is absolute on Windows too.
    const absoluteDatabasePath = resolve(tmpdir(), 'example-scratch', 'example-store.sqlite');
    const absoluteUploadDirectory = resolve(tmpdir(), 'example-scratch', 'example-uploads');
    process.env['DUINZICHT_DATABASE_PATH'] = absoluteDatabasePath;
    process.env['DUINZICHT_UPLOAD_DIRECTORY'] = absoluteUploadDirectory;

    expect(ApiEnvironment.databasePath).toBe(absoluteDatabasePath);
    expect(ApiEnvironment.uploadDirectory).toBe(absoluteUploadDirectory);
  });

  it('resolves a relative override against the repository root, whichever directory the process runs in', () => {
    process.env['DUINZICHT_DATABASE_PATH'] = 'example-scratch/example-store.sqlite';
    process.env['DUINZICHT_UPLOAD_DIRECTORY'] = 'example-scratch/example-uploads';

    expect(ApiEnvironment.databasePath).toBe(resolve(repositoryRoot(), 'example-scratch', 'example-store.sqlite'));
    expect(ApiEnvironment.uploadDirectory).toBe(resolve(repositoryRoot(), 'example-scratch', 'example-uploads'));
  });
});
