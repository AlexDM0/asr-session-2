import type { PhotoMediaType } from '../../shared/model/Claim';

const JPEG_SIGNATURE = [0xFF, 0xD8, 0xFF] as const;
const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] as const;
const HEIC_BRANDS: readonly string[] = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs'];
const GENERIC_IMAGE_BRANDS: readonly string[] = ['mif1', 'msf1'];
const FILE_TYPE_BOX_TYPE_OFFSET = 4;
const FILE_TYPE_BOX_MAJOR_BRAND_OFFSET = 8;
const FILE_TYPE_BOX_COMPATIBLE_BRANDS_OFFSET = 16;
const BRAND_LENGTH = 4;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
}

function asciiAt(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + BRAND_LENGTH));
}

function isHeic(bytes: Uint8Array): boolean {
  if (bytes.length < FILE_TYPE_BOX_COMPATIBLE_BRANDS_OFFSET || asciiAt(bytes, FILE_TYPE_BOX_TYPE_OFFSET) !== 'ftyp') {
    return false;
  }
  const majorBrand = asciiAt(bytes, FILE_TYPE_BOX_MAJOR_BRAND_OFFSET);
  if (HEIC_BRANDS.includes(majorBrand)) {
    return true;
  }
  if (!GENERIC_IMAGE_BRANDS.includes(majorBrand)) {
    return false;
  }
  const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  const boxEnd = Math.min(boxSize, bytes.length);
  for (let offset = FILE_TYPE_BOX_COMPATIBLE_BRANDS_OFFSET; offset + BRAND_LENGTH <= boxEnd; offset += BRAND_LENGTH) {
    if (HEIC_BRANDS.includes(asciiAt(bytes, offset))) {
      return true;
    }
  }
  return false;
}

/** Recognises a photo by its first bytes only; the declared type and file name are never trusted. */
export const ClaimPhotoContentTypeUtil = Object.freeze({
  mediaTypeOf(bytes: Uint8Array): PhotoMediaType | 'unsupported' {
    if (startsWith(bytes, JPEG_SIGNATURE)) {
      return 'image/jpeg';
    }
    if (startsWith(bytes, PNG_SIGNATURE)) {
      return 'image/png';
    }
    return isHeic(bytes) ? 'image/heic' : 'unsupported';
  },
});
