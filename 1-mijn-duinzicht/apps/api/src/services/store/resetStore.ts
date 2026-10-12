import { mkdir, readdir, rm } from 'node:fs/promises';
import { join }               from 'node:path';

import { type SeededStoreLocation, type SeededStoreVerdict, buildSeededStore } from './buildSeededStore';

export interface ResetStoreLocation extends SeededStoreLocation {
  readonly uploadDirectory: string;
}

/** Replaces the store with the seed whatever the old file holds (even a file that is not a database), then empties the upload directory. */
export async function resetStore(location: ResetStoreLocation): Promise<SeededStoreVerdict> {
  const builtVerdict = await buildSeededStore(location);
  if (builtVerdict.outcome !== 'built') {
    return builtVerdict;
  }
  await mkdir(location.uploadDirectory, { recursive: true });
  for (const entryName of await readdir(location.uploadDirectory)) {
    await rm(join(location.uploadDirectory, entryName), { recursive: true, force: true });
  }
  return builtVerdict;
}
