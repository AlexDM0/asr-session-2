/** The policy sheet's text and file name are pinned; synthetic policy data stands in for the seed. */
import { describe, expect, it } from 'bun:test';

import { policySheetDocumentFor } from './policySheetDocument';

describe('policySheetDocumentFor', () => {
  const document = policySheetDocumentFor({
    id:                  'EX-POLICY-1',
    kind:                'home',
    name:                'Example policy',
    subtitle:            'Example subtitle',
    monthlyPremiumCents: 100,
    status:              'active',
    facts:               [],
    coverage:            [],
  }, 'Alex Example');

  it('gives the five lines in order: title, policy name, policy number, full name and the sample notice', () => {
    expect(document.lines).toEqual([
      'Polisblad',
      'Example policy',
      'Polisnummer EX-POLICY-1',
      'Alex Example',
      'Dit is een voorbeelddocument van Duinzicht Verzekeringen.',
    ]);
  });

  it('names the file polisblad-{policy number}.pdf', () => {
    expect(document.fileName).toBe('polisblad-EX-POLICY-1.pdf');
  });
});
