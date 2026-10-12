/**
 * The upload reader decides 400, 422, 415 and 413 before anything is stored. What matters: any part
 * that is not a file named `photos` is malformed, the checks run in the order count, type, size, the
 * size limit is inclusive, and the media type comes from the content, never from the declared type.
 */
import { describe, expect, it } from 'bun:test';

import { ClaimPhotoUploadUtil, PHOTO_SIZE_LIMIT_BYTES } from './ClaimPhotoUploadUtil';

const JPEG_HEADER = [0xFF, 0xD8, 0xFF, 0xE0];

function jpegFile(fileName: string, sizeBytes = JPEG_HEADER.length): File {
  const content = new Uint8Array(sizeBytes);
  content.set(JPEG_HEADER);
  return new File([content], fileName, { type: 'text/plain' });
}

function formDataWith(parts: readonly (readonly [string, string | File])[]): FormData {
  const formData = new FormData();
  for (const [partName, partValue] of parts) {
    formData.append(partName, partValue);
  }
  return formData;
}

describe('ClaimPhotoUploadUtil.photosFrom', () => {
  it('refuses a text part as malformed', async () => {
    expect(await ClaimPhotoUploadUtil.photosFrom(formDataWith([['photos', jpegFile('a.jpg')], ['photos', 'text']]))).toStrictEqual({ outcome: 'malformed' });
  });

  it('refuses a file part named otherwise as malformed', async () => {
    expect(await ClaimPhotoUploadUtil.photosFrom(formDataWith([['photo', jpegFile('a.jpg')]]))).toStrictEqual({ outcome: 'malformed' });
  });

  it('refuses zero and eleven files as out of range', async () => {
    expect(await ClaimPhotoUploadUtil.photosFrom(formDataWith([]))).toStrictEqual({ outcome: 'countOutOfRange' });
    const elevenFiles = Array.from({ length: 11 }, (_, index) => ['photos', jpegFile(`photo-${index}.jpg`)] as const);
    expect(await ClaimPhotoUploadUtil.photosFrom(formDataWith(elevenFiles))).toStrictEqual({ outcome: 'countOutOfRange' });
  });

  it('refuses text content named .jpg and an empty file as unsupported', async () => {
    const textFile = new File(['Example text content'], 'example.jpg', { type: 'image/jpeg' });
    expect(await ClaimPhotoUploadUtil.photosFrom(formDataWith([['photos', textFile]]))).toStrictEqual({ outcome: 'unsupportedType' });
    expect(await ClaimPhotoUploadUtil.photosFrom(formDataWith([['photos', new File([], 'empty.jpg')]]))).toStrictEqual({ outcome: 'unsupportedType' });
  });

  it('refuses one byte above the size limit and accepts exactly the limit', async () => {
    expect(await ClaimPhotoUploadUtil.photosFrom(formDataWith([['photos', jpegFile('large.jpg', PHOTO_SIZE_LIMIT_BYTES + 1)]]))).toStrictEqual({ outcome: 'tooLarge' });
    const verdict = await ClaimPhotoUploadUtil.photosFrom(formDataWith([['photos', jpegFile('limit.jpg', PHOTO_SIZE_LIMIT_BYTES)]]));
    expect(verdict.outcome).toBe('read');
  });

  it('checks the type before the size', async () => {
    const largeText = new File([new Uint8Array(PHOTO_SIZE_LIMIT_BYTES + 1)], 'large.jpg');
    expect(await ClaimPhotoUploadUtil.photosFrom(formDataWith([['photos', largeText]]))).toStrictEqual({ outcome: 'unsupportedType' });
  });

  it('reads each photo with its verbatim file name, detected media type, size and content', async () => {
    const verdict = await ClaimPhotoUploadUtil.photosFrom(formDataWith([['photos', jpegFile('Example Photo.JPG')], ['photos', jpegFile('')]]));

    expect(verdict).toStrictEqual({
      outcome: 'read',
      photos:  [
        {
          originalFileName: 'Example Photo.JPG', mediaType: 'image/jpeg', sizeBytes: 4, content: new Uint8Array(JPEG_HEADER),
        },
        {
          originalFileName: '', mediaType: 'image/jpeg', sizeBytes: 4, content: new Uint8Array(JPEG_HEADER),
        },
      ],
    });
  });
});
