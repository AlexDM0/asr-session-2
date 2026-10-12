import {
  mkdir,
  mkdtemp,
  realpath,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import type { Server } from 'bun';

import { bundledSeedPath }   from './adapters/seed/SeedIngestion';
import { createApiServer }   from './createApiServer';
import { createPortalStore } from './services/store/PortalStore';
import { buildSeededStore }  from './services/store/buildSeededStore';
import { resetStore }        from './services/store/resetStore';

/**
 * Test helpers that run the real API on a scratch store. Every path is checked to lie inside a fresh
 * temporary directory, so a test can never open the development store.
 */
export interface ScratchStoreDirectory {
  readonly temporaryRoot:   string;
  readonly databasePath:    string;
  readonly uploadDirectory: string;
  remove(): Promise<void>;
}

export interface ScratchApiServer {
  readonly origin:          string;
  readonly databasePath:    string;
  readonly uploadDirectory: string;
  restart(): Promise<void>;
  reset(): Promise<void>;
  stop(): Promise<void>;
}

/** Where the store and the upload directory go, resolved against the temporary root; the defaults are what every suite uses. */
export interface ScratchStoreLayout {
  readonly databasePath?:    string;
  readonly uploadDirectory?: string;
}

const DEFAULT_DATABASE_FILE_NAME = 'portal.sqlite';
const DEFAULT_UPLOAD_DIRECTORY_NAME = 'uploads';
const TEMPORARY_DIRECTORY_PREFIX = 'mijn-duinzicht-scratch-';

function liesInside(directory: string, path: string): boolean {
  const relativePath = relative(directory, path);
  return relativePath !== '' && !relativePath.startsWith('..') && !isAbsolute(relativePath);
}

export async function createScratchStoreDirectory(layout: ScratchStoreLayout = {}): Promise<ScratchStoreDirectory> {
  const temporaryRoot = await mkdtemp(join(await realpath(tmpdir()), TEMPORARY_DIRECTORY_PREFIX));
  const remove = () => rm(temporaryRoot, { recursive: true, force: true });
  const databasePath = resolve(temporaryRoot, layout.databasePath ?? DEFAULT_DATABASE_FILE_NAME);
  const uploadDirectory = resolve(temporaryRoot, layout.uploadDirectory ?? DEFAULT_UPLOAD_DIRECTORY_NAME);
  for (const [description, path] of [['database path', databasePath], ['upload directory', uploadDirectory]] as const) {
    if (!liesInside(temporaryRoot, path)) {
      await remove();
      throw new Error(`Refusing to use the ${description} ${path}: it lies outside the temporary directory ${temporaryRoot}.`);
    }
  }
  return {
    temporaryRoot, databasePath, uploadDirectory, remove,
  };
}

export async function startScratchApiServer(layout: ScratchStoreLayout = {}): Promise<ScratchApiServer> {
  const scratchDirectory = await createScratchStoreDirectory(layout);
  const { databasePath, uploadDirectory } = scratchDirectory;
  const seedPath = bundledSeedPath();
  const builtVerdict = await buildSeededStore({ databasePath, seedPath });
  if (builtVerdict.outcome !== 'built') {
    await scratchDirectory.remove();
    throw new Error(`The bundled seed cannot be used: ${builtVerdict.problems.join(' ')}`);
  }
  await mkdir(uploadDirectory, { recursive: true });

  function startServer(): Server<undefined> {
    const serverVerdict = createApiServer({ context: { store: createPortalStore(databasePath), uploadDirectory, log: () => undefined }, port: 0 });
    if (serverVerdict.outcome !== 'started') {
      throw new Error(`The path ${serverVerdict.path} is declared twice for ${serverVerdict.method}.`);
    }
    return serverVerdict.server;
  }

  let server = startServer();
  return {
    get origin() {
      return `http://localhost:${server.port}`;
    },
    databasePath,
    uploadDirectory,
    async restart() {
      await server.stop(true);
      server = startServer();
    },
    async reset() {
      await resetStore({ databasePath, uploadDirectory, seedPath });
    },
    async stop() {
      await server.stop(true);
      await scratchDirectory.remove();
    },
  };
}
