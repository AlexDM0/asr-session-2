/**
 * Photos are stored all-or-nothing. What matters: the directory is created on first use,
 * names follow the detected media type, no temporary file stays behind, and a write failing halfway
 * removes every file of that call. Runs only in a fresh temporary directory.
 */
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join }   from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import type { ReceivedPhoto } from '../../../shared/model/Claim';

import { createClaimPhotoFileWriter } from './ClaimPhotoFileWriter';

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

function examplePhoto(mediaType: ReceivedPhoto['mediaType'], content: Uint8Array = new Uint8Array([1, 2, 3])): ReceivedPhoto {
  return {
    originalFileName: 'example', mediaType, sizeBytes: content.byteLength, content,
  };
}

let temporaryRoot: string;
let uploadDirectory: string;

beforeEach(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), 'claim-photo-file-writer-'));
  uploadDirectory = join(temporaryRoot, 'uploads');
});

afterEach(async () => {
  await rm(temporaryRoot, { recursive: true, force: true });
});

describe('createClaimPhotoFileWriter', () => {
  it('creates the upload directory on first use and names each file by its media type', async () => {
    const storedFiles = await createClaimPhotoFileWriter({ uploadDirectory }).writePhotos([
      examplePhoto('image/jpeg'), examplePhoto('image/png'), examplePhoto('image/heic'),
    ]);

    expect(storedFiles.map((storedFile) => storedFile.storedFileName)).toEqual([
      expect.stringMatching(new RegExp(`^${UUID_PATTERN}\\.jpg$`)),
      expect.stringMatching(new RegExp(`^${UUID_PATTERN}\\.png$`)),
      expect.stringMatching(new RegExp(`^${UUID_PATTERN}\\.heic$`)),
    ]);
    expect(storedFiles.every((storedFile) => storedFile.storedFileName.startsWith(storedFile.photoId))).toBe(true);
    expect((await readdir(uploadDirectory)).toSorted()).toStrictEqual(storedFiles.map((storedFile) => storedFile.storedFileName).toSorted());
  });

  it('writes the content and leaves no temporary file', async () => {
    const [storedFile] = await createClaimPhotoFileWriter({ uploadDirectory }).writePhotos([examplePhoto('image/jpeg', new Uint8Array([7, 8, 9]))]);

    expect(new Uint8Array(await readFile(join(uploadDirectory, storedFile?.storedFileName ?? '')))).toStrictEqual(new Uint8Array([7, 8, 9]));
    expect((await readdir(uploadDirectory)).some((fileName) => fileName.includes('.writing-'))).toBe(false);
  });

  it('removes the named files', async () => {
    const writer = createClaimPhotoFileWriter({ uploadDirectory });
    const storedFiles = await writer.writePhotos([examplePhoto('image/jpeg'), examplePhoto('image/png')]);

    await writer.removePhotos(storedFiles.map((storedFile) => storedFile.storedFileName));

    expect(await readdir(uploadDirectory)).toStrictEqual([]);
  });

  it('leaves no file of a call whose write fails halfway', async () => {
    const unwritablePhoto = { ...examplePhoto('image/png'), content: undefined as unknown as Uint8Array };

    const writing = createClaimPhotoFileWriter({ uploadDirectory }).writePhotos([examplePhoto('image/jpeg'), unwritablePhoto]);

    await expect(writing).rejects.toThrow();
    expect(await readdir(uploadDirectory)).toStrictEqual([]);
  });
});
