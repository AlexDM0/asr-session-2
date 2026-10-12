/**
 * The copy file is the one source of the screen's Dutch phrasing, so every computed text is checked
 * verbatim: all nine 0/1/2+ lead combinations and the three greetings.
 */
import { describe, expect, it } from 'bun:test';

import { OVERVIEW_COPY } from './overviewCopy';

const LEAD_COMBINATIONS = [
  { policies: 0, claims: 0, lead: 'Je hebt geen lopende verzekeringen en geen openstaande schademeldingen.' },
  { policies: 0, claims: 1, lead: 'Je hebt geen lopende verzekeringen en 1 openstaande schademelding.' },
  { policies: 0, claims: 2, lead: 'Je hebt geen lopende verzekeringen en 2 openstaande schademeldingen.' },
  { policies: 1, claims: 0, lead: 'Je hebt 1 lopende verzekering en geen openstaande schademeldingen.' },
  { policies: 1, claims: 1, lead: 'Je hebt 1 lopende verzekering en 1 openstaande schademelding.' },
  { policies: 1, claims: 2, lead: 'Je hebt 1 lopende verzekering en 2 openstaande schademeldingen.' },
  { policies: 4, claims: 0, lead: 'Je hebt 4 lopende verzekeringen en geen openstaande schademeldingen.' },
  { policies: 4, claims: 1, lead: 'Je hebt 4 lopende verzekeringen en 1 openstaande schademelding.' },
  { policies: 12, claims: 3, lead: 'Je hebt 12 lopende verzekeringen en 3 openstaande schademeldingen.' },
] as const;

describe('OVERVIEW_COPY', () => {
  it('phrases the lead for every combination of zero, one and several policies and claims', () => {
    for (const { policies, claims, lead } of LEAD_COMBINATIONS) {
      expect(OVERVIEW_COPY.leadSentence(policies, claims)).toBe(lead);
    }
  });

  it('greets by day part with the first name', () => {
    expect(OVERVIEW_COPY.greetingHeading('morning', 'Alex')).toBe('Goedemorgen, Alex');
    expect(OVERVIEW_COPY.greetingHeading('afternoon', 'Alex')).toBe('Goedemiddag, Alex');
    expect(OVERVIEW_COPY.greetingHeading('evening', 'Alex')).toBe('Goedenavond, Alex');
  });
});
