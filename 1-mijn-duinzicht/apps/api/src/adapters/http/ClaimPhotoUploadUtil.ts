import type { ReceivedPhoto } from '../../shared/model/Claim';

import { ClaimPhotoContentTypeUtil } from './ClaimPhotoContentTypeUtil';

export type ClaimPhotoUploadVerdict =
  | { readonly outcome: 'read'; readonly photos: readonly ReceivedPhoto[] }
  | { readonly outcome: 'malformed' }
  | { readonly outcome: 'countOutOfRange' }
  | { readonly outcome: 'unsupportedType' }
  | { readonly outcome: 'tooLarge' };

export const PHOTO_PART_NAME = 'photos';
export const PHOTO_SIZE_LIMIT_BYTES = 10 * 1024 * 1024;
export const PHOTO_COUNT_MINIMUM = 1;
export const PHOTO_COUNT_MAXIMUM = 10;

interface FilePart {
  readonly name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** What the upload reads of a `FormData`; structural because Bun's global `FormData` types its entries as strings only. */
export interface PhotoFormData {
  forEach(readPart: (value: string | FilePart, partName: string) => void): void;
}

interface PhotoCandidate {
  readonly file:      FilePart;
  readonly content:   Uint8Array;
  readonly mediaType: ReturnType<typeof ClaimPhotoContentTypeUtil.mediaTypeOf>;
}

/** Reads the photo parts of an upload with the checks in a fixed order: parts, count, type, size. */
export const ClaimPhotoUploadUtil = Object.freeze({
  async photosFrom(formData: PhotoFormData): Promise<ClaimPhotoUploadVerdict> {
    const files: FilePart[] = [];
    let hasOtherPart = false;
    formData.forEach((partValue, partName) => {
      if (partName !== PHOTO_PART_NAME || typeof partValue === 'string') {
        hasOtherPart = true;
      } else {
        files.push(partValue);
      }
    });
    if (hasOtherPart) {
      return { outcome: 'malformed' };
    }
    if (files.length < PHOTO_COUNT_MINIMUM || files.length > PHOTO_COUNT_MAXIMUM) {
      return { outcome: 'countOutOfRange' };
    }
    const candidates: PhotoCandidate[] = await Promise.all(files.map(async (file) => {
      const content = new Uint8Array(await file.arrayBuffer());
      return { file, content, mediaType: ClaimPhotoContentTypeUtil.mediaTypeOf(content) };
    }));
    if (candidates.some((candidate) => candidate.mediaType === 'unsupported')) {
      return { outcome: 'unsupportedType' };
    }
    if (candidates.some((candidate) => candidate.content.byteLength > PHOTO_SIZE_LIMIT_BYTES)) {
      return { outcome: 'tooLarge' };
    }
    return {
      outcome: 'read',
      photos:  candidates.flatMap((candidate) => (candidate.mediaType === 'unsupported' ? [] : [{
        originalFileName: candidate.file.name,
        mediaType:        candidate.mediaType,
        sizeBytes:        candidate.content.byteLength,
        content:          candidate.content,
      }])),
    };
  },
});
