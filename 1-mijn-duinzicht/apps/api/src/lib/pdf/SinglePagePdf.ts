/**
 * Writes a valid one-page A4 PDF 1.4 with lines of Helvetica text: WinAnsi encoding, an uncompressed
 * content stream (so its text stays greppable) and a correct cross-reference table.
 */
const PAGE_WIDTH_POINTS = 595;
const PAGE_HEIGHT_POINTS = 842;
const MARGIN_POINTS = 72;
const FONT_SIZE_POINTS = 12;
const LINE_HEIGHT_POINTS = 18;
const CROSS_REFERENCE_OFFSET_DIGITS = 10;
const HIGHEST_LATIN_1_CODE_POINT = 0xFF;
const FIRST_LATIN_1_SUPPLEMENT_CODE_POINT = 0xA0;
const HIGHEST_ASCII_CODE_POINT = 0x7E;
const LOWEST_PRINTABLE_ASCII_CODE_POINT = 0x20;
const REPLACEMENT_CHARACTER = '?';

/** WinAnsi equals Latin-1 for printable ASCII and 0xA0–0xFF; these are the characters it places in 0x80–0x9F. */
const WIN_ANSI_BYTE_BY_CHARACTER: Readonly<Record<string, number>> = {
  '€': 0x80,
  '‚': 0x82,
  '„': 0x84,
  '…': 0x85,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
};

function winAnsiCharacterFor(character: string): string {
  const codePoint = character.codePointAt(0) ?? 0;
  const isPrintableAscii = codePoint >= LOWEST_PRINTABLE_ASCII_CODE_POINT && codePoint <= HIGHEST_ASCII_CODE_POINT;
  const isLatin1Supplement = codePoint >= FIRST_LATIN_1_SUPPLEMENT_CODE_POINT && codePoint <= HIGHEST_LATIN_1_CODE_POINT;
  if (isPrintableAscii || isLatin1Supplement) {
    return character;
  }
  if (Object.hasOwn(WIN_ANSI_BYTE_BY_CHARACTER, character)) {
    return String.fromCharCode(WIN_ANSI_BYTE_BY_CHARACTER[character] ?? 0);
  }
  return REPLACEMENT_CHARACTER;
}

function pdfStringFor(line: string): string {
  const winAnsiText = Array.from(line, winAnsiCharacterFor).join('');
  return `(${winAnsiText.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')})`;
}

function contentStreamFor(lines: readonly string[]): string {
  const textOperators = lines.map((line, index) => `${index === 0 ? '' : 'T* '}${pdfStringFor(line)} Tj`);
  return [
    'BT',
    `/F1 ${FONT_SIZE_POINTS} Tf`,
    `${LINE_HEIGHT_POINTS} TL`,
    `${MARGIN_POINTS} ${PAGE_HEIGHT_POINTS - MARGIN_POINTS} Td`,
    ...textOperators,
    'ET',
  ].join('\n');
}

function bytesOf(byteString: string): Uint8Array {
  return Uint8Array.from(byteString, (character) => character.charCodeAt(0));
}

export function singlePagePdfFor(lines: readonly string[]): Uint8Array {
  const contentStream = contentStreamFor(lines);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH_POINTS} ${PAGE_HEIGHT_POINTS}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`,
  ];
  let document = '%PDF-1.4\n%âãÏÓ\n';
  const objectOffsets: number[] = [];
  objects.forEach((objectBody, index) => {
    objectOffsets.push(document.length);
    document += `${index + 1} 0 obj\n${objectBody}\nendobj\n`;
  });
  const crossReferenceOffset = document.length;
  const crossReferenceEntries = objectOffsets.map((offset) => `${String(offset).padStart(CROSS_REFERENCE_OFFSET_DIGITS, '0')} 00000 n \n`);
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${crossReferenceEntries.join('')}`;
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${crossReferenceOffset}\n%%EOF\n`;
  return bytesOf(document);
}
