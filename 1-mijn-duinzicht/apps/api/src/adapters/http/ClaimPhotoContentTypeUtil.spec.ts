/**
 * Content recognition decides what the server stores, so every accepted signature is pinned, HEIC by
 * each major brand and through a generic brand with and without a HEIC compatible brand, and content
 * that only looks like an image by name is refused.
 */
import { describe, expect, it } from 'bun:test';

import { ClaimPhotoContentTypeUtil } from './ClaimPhotoContentTypeUtil';

function asciiBytes(text: string): number[] {
  return [...text].map((character) => character.charCodeAt(0));
}

function fileTypeBox(majorBrand: string, compatibleBrands: readonly string[]): Uint8Array {
  const boxSize = 16 + 4 * compatibleBrands.length;
  return new Uint8Array([
    0,
    0,
    0,
    boxSize,
    ...asciiBytes('ftyp'),
    ...asciiBytes(majorBrand),
    0,
    0,
    0,
    0,
    ...compatibleBrands.flatMap(asciiBytes),
  ]);
}

describe('ClaimPhotoContentTypeUtil.mediaTypeOf', () => {
  it('recognises JPEG by its first three bytes', () => {
    expect(ClaimPhotoContentTypeUtil.mediaTypeOf(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00]))).toBe('image/jpeg');
  });

  it('recognises PNG by its eight-byte signature', () => {
    expect(ClaimPhotoContentTypeUtil.mediaTypeOf(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]))).toBe('image/png');
  });

  it.each(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs'])('recognises HEIC with the major brand %s', (majorBrand) => {
    expect(ClaimPhotoContentTypeUtil.mediaTypeOf(fileTypeBox(majorBrand, []))).toBe('image/heic');
  });

  it.each(['mif1', 'msf1'])('recognises HEIC with the generic brand %s listing a HEIC compatible brand', (majorBrand) => {
    expect(ClaimPhotoContentTypeUtil.mediaTypeOf(fileTypeBox(majorBrand, ['miaf', 'heic']))).toBe('image/heic');
  });

  it.each(['mif1', 'msf1'])('refuses the generic brand %s without a HEIC compatible brand', (majorBrand) => {
    expect(ClaimPhotoContentTypeUtil.mediaTypeOf(fileTypeBox(majorBrand, ['miaf', 'avif']))).toBe('unsupported');
  });

  it('refuses empty content, a PDF and plain text', () => {
    expect(ClaimPhotoContentTypeUtil.mediaTypeOf(new Uint8Array([]))).toBe('unsupported');
    expect(ClaimPhotoContentTypeUtil.mediaTypeOf(new Uint8Array(asciiBytes('%PDF-1.7')))).toBe('unsupported');
    expect(ClaimPhotoContentTypeUtil.mediaTypeOf(new Uint8Array(asciiBytes('Example text content')))).toBe('unsupported');
  });
});
