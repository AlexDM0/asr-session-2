/**
 * The writer must produce a file a viewer opens, so the cases that matter are the structure a reader
 * relies on (header, one page, cross-reference offsets that point at their objects, the startxref
 * pointer) and the text: every line present in WinAnsi, with PDF string delimiters escaped.
 */
import { describe, expect, it } from 'bun:test';

import { singlePagePdfFor } from './SinglePagePdf';

/** One character per byte, so offsets in the text are byte offsets in the file. */
function textOf(document: Uint8Array): string {
  return Array.from(document, (byte) => String.fromCharCode(byte)).join('');
}

describe('singlePagePdfFor', () => {
  it('writes a PDF 1.4 document with exactly one page and an end-of-file marker', () => {
    const text = textOf(singlePagePdfFor(['Example line']));

    expect(text.startsWith('%PDF-1.4\n')).toBe(true);
    expect(text).toContain('/Type /Pages /Kids [3 0 R] /Count 1');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('points every cross-reference entry at the start of its object', () => {
    const text = textOf(singlePagePdfFor(['Example line one', 'Example line two']));
    const crossReferenceStart = text.indexOf('\nxref\n') + 1;
    const entryLines = text.slice(crossReferenceStart).split('\n').slice(3, 8);

    expect(entryLines).toHaveLength(5);
    entryLines.forEach((entryLine, index) => {
      const offset = Number(entryLine.slice(0, 10));
      expect(entryLine).toEndWith(' 00000 n ');
      expect(text.slice(offset).startsWith(`${index + 1} 0 obj\n`)).toBe(true);
    });
  });

  it('points startxref at the cross-reference table', () => {
    const text = textOf(singlePagePdfFor(['Example line']));
    const startCrossReferenceOffset = Number(/startxref\n(\d+)\n%%EOF/.exec(text)?.[1]);

    expect(text.slice(startCrossReferenceOffset).startsWith('xref\n0 6\n')).toBe(true);
  });

  it('declares the exact length of the uncompressed content stream', () => {
    const text = textOf(singlePagePdfFor(['Example line']));
    const declaredLength = Number(/<< \/Length (\d+) >>\nstream\n/.exec(text)?.[1]);
    const streamStart = text.indexOf('stream\n') + 'stream\n'.length;

    expect(text.slice(streamStart + declaredLength)).toStartWith('\nendstream');
  });

  it('writes every line as a text string in order', () => {
    const text = textOf(singlePagePdfFor(['Example title', 'Example second line', 'Example third line']));

    expect(text).toContain('(Example title) Tj\nT* (Example second line) Tj\nT* (Example third line) Tj');
  });

  it('encodes the euro sign and accented letters in WinAnsi and escapes parentheses and backslashes', () => {
    const document = singlePagePdfFor(['€ 1,00 café (example) a\\b']);
    const text = textOf(document);

    expect(text).toContain('(\u0080 1,00 café \\(example\\) a\\\\b) Tj');
    expect(document.every((byte) => byte <= 0xFF)).toBe(true);
  });
});
