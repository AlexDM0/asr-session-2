/**
 * The stored shape of a new claim: the title per category, the reported status
 * without handler or deadline, the trimmed description with its inner line breaks, and the four steps.
 */
import { describe, expect, it } from 'bun:test';

import type { Policy } from '../../shared/model/Policy';

import { NewClaimUtil } from './NewClaimUtil';

const EXAMPLE_POLICY: Policy = {
  id: 'DZ-EX-000001', kind: 'car', name: 'Example policy', subtitle: 'Example subtitle', monthlyPremiumCents: 100, status: 'active', facts: [], coverage: [],
};

describe('NewClaimUtil.claimFor', () => {
  it('builds a reported claim with four steps of which the second is current', () => {
    const claim = NewClaimUtil.claimFor(
      {
        category: 'car', policyId: 'DZ-EX-000001', incidentDate: '2026-10-01', description: '  Example line one\nExample line two \n',
      },
      { claimId: 'S-2026-0001', reportedAt: '2026-10-08T14:03', policy: EXAMPLE_POLICY },
    );

    expect(claim).toStrictEqual({
      id:            'S-2026-0001',
      title:         'Schade met auto',
      category:      'car',
      policyId:      'DZ-EX-000001',
      reportedAt:    '2026-10-08T14:03',
      status:        'reported',
      handlerName:   null,
      incidentDate:  '2026-10-01',
      description:   'Example line one\nExample line two',
      photoDeadline: null,
      steps:         [
        {
          title: 'Schade gemeld', description: '8 oktober 2026, 14:03', state: 'done', waitsForPhotos: false,
        },
        {
          title: 'Melding ontvangen', description: 'We wijzen je melding toe aan een behandelaar', state: 'current', waitsForPhotos: false,
        },
        {
          title: 'Aanvullende informatie', description: 'Als we meer van je nodig hebben, hoor je het van ons', state: 'todo', waitsForPhotos: false,
        },
        {
          title: 'Beoordeling en uitbetaling', description: 'Binnen 5 werkdagen na ontvangst', state: 'todo', waitsForPhotos: false,
        },
      ],
    });
  });

  it.each([['home', 'Schade aan huis'], ['travel', 'Schade op reis'], ['liability', 'Schade aan een ander']] as const)('titles a %s claim "%s"', (category, title) => {
    const claim = NewClaimUtil.claimFor(
      {
        category, policyId: 'DZ-EX-000001', incidentDate: '2026-10-01', description: 'Example claim description.',
      },
      { claimId: 'S-2026-0001', reportedAt: '2026-10-08T14:03', policy: EXAMPLE_POLICY },
    );

    expect(claim.title).toBe(title);
  });
});
