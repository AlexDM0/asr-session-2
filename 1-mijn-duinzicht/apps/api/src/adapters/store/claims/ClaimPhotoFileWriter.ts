import {
  mkdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

import type { PhotoMediaType, ReceivedPhoto } from '../../../shared/model/Claim';

const EXTENSION_BY_MEDIA_TYPE: Readonly<Record<PhotoMediaType, string>> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/heic': 'heic',
};

export interface ClaimPhotoFileWriterOptions {
  readonly uploadDirectory: string;
}

export interface StoredPhotoFile {
  readonly photoId:        string;
  readonly storedFileName: string;
}

export interface ClaimPhotoFileWriter {
  /** Writes every photo or none: on a failure the files this call wrote are removed and the error is thrown on. */
  writePhotos(photos: readonly ReceivedPhoto[]): Promise<StoredPhotoFile[]>;
  removePhotos(storedFileNames: readonly string[]): Promise<void>;
}

export function createClaimPhotoFileWriter({ uploadDirectory }: ClaimPhotoFileWriterOptions): ClaimPhotoFileWriter {
  async function removePhotos(storedFileNames: readonly string[]): Promise<void> {
    await Promise.all(storedFileNames.map((storedFileName) => rm(join(uploadDirectory, storedFileName), { force: true })));
  }

  return {
    async writePhotos(photos) {
      await mkdir(uploadDirectory, { recursive: true });
      const storedFiles: StoredPhotoFile[] = [];
      const temporaryFileNames: string[] = [];
      try {
        for (const photo of photos) {
          const photoId = crypto.randomUUID();
          const storedFileName = `${photoId}.${EXTENSION_BY_MEDIA_TYPE[photo.mediaType]}`;
          const temporaryFileName = `${storedFileName}.writing-${photoId}`;
          temporaryFileNames.push(temporaryFileName);
          await writeFile(join(uploadDirectory, temporaryFileName), photo.content);
          await rename(join(uploadDirectory, temporaryFileName), join(uploadDirectory, storedFileName));
          storedFiles.push({ photoId, storedFileName });
        }
        return storedFiles;
      } catch (error) {
        await removePhotos([...temporaryFileNames, ...storedFiles.map((storedFile) => storedFile.storedFileName)]);
        throw error;
      }
    },
    removePhotos,
  };
}
