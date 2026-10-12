/**
 * The server is the authority on a claim report. What matters: each category accepts only its
 * eligible active policy kinds, an unknown, ended or ineligible policy is notEligible, a missing
 * category skips the policy judgement while the other fields are still checked, and every failure is
 * collected in one verdict. `today` is passed in; no clock is read.
 */
import { describe, expect, it } from 'bun:test';

import type { ClaimCategory } from '../../shared/model/Claim';
import type { Policy }        from '../../shared/model/Policy';

import { ClaimCreationVerdictUtil } from './ClaimCreationVerdictUtil';

function examplePolicy(id: string, kind: Policy['kind'], status: Policy['status'] = 'active'): Policy {
  return {
    id, kind, name: `Example ${kind} policy`, subtitle: 'Example subtitle', monthlyPremiumCents: 100, status, facts: [], coverage: [],
  };
}

const POLICIES: readonly Policy[] = [
  examplePolicy('EX-HOME', 'home'),
  examplePolicy('EX-CONTENTS', 'contents'),
  examplePolicy('EX-CAR', 'car'),
  examplePolicy('EX-LIABILITY', 'liability'),
  examplePolicy('EX-ENDED-CAR', 'car', 'ended'),
];

const TODAY = '2099-06-15';

const ACCEPTABLE_CREATION = {
  category: 'car', policyId: 'EX-CAR', incidentDate: '2099-06-01', description: 'Example claim description.',
} as const;

function verdictFor(overrides: Record<string, unknown>): unknown {
  return ClaimCreationVerdictUtil.verdictFor({ ...ACCEPTABLE_CREATION, ...overrides }, { policies: POLICIES, today: TODAY });
}

const ELIGIBLE_POLICY_IDS: Readonly<Record<ClaimCategory, readonly string[]>> = {
  home:      ['EX-HOME', 'EX-CONTENTS'],
  car:       ['EX-CAR'],
  travel:    ['EX-CONTENTS'],
  liability: ['EX-LIABILITY'],
};

describe('ClaimCreationVerdictUtil.verdictFor', () => {
  it.each(Object.entries(ELIGIBLE_POLICY_IDS))('accepts for %s exactly the eligible active policies %p', (category, eligiblePolicyIds) => {
    for (const policy of POLICIES) {
      const expected = eligiblePolicyIds.includes(policy.id)
        ? { outcome: 'acceptable' }
        : { outcome: 'refused', fieldErrors: [{ field: 'policyId', reason: 'notEligible' }] };
      expect(verdictFor({ category, policyId: policy.id })).toStrictEqual(expected);
    }
  });

  it('refuses an unknown policy as notEligible', () => {
    expect(verdictFor({ policyId: 'EX-UNKNOWN' })).toStrictEqual({ outcome: 'refused', fieldErrors: [{ field: 'policyId', reason: 'notEligible' }] });
  });

  it('judges no policy without a category but still checks the other fields', () => {
    const verdict = ClaimCreationVerdictUtil.verdictFor({ policyId: 'EX-UNKNOWN', incidentDate: '2099-06-16', description: 'short' }, { policies: POLICIES, today: TODAY });

    expect(verdict).toStrictEqual({
      outcome:     'refused',
      fieldErrors: [{ field: 'incidentDate', reason: 'inFuture' }, { field: 'description', reason: 'tooShort' }],
    });
  });

  it('refuses an impossible date as invalidFormat and accepts today itself', () => {
    expect(verdictFor({ incidentDate: '2099-02-31' })).toStrictEqual({ outcome: 'refused', fieldErrors: [{ field: 'incidentDate', reason: 'invalidFormat' }] });
    expect(verdictFor({ incidentDate: TODAY })).toStrictEqual({ outcome: 'acceptable' });
  });

  it('refuses an empty, a too short and a too long description', () => {
    expect(verdictFor({ description: '  \n ' })).toStrictEqual({ outcome: 'refused', fieldErrors: [{ field: 'description', reason: 'required' }] });
    expect(verdictFor({ description: 'Too short' })).toStrictEqual({ outcome: 'refused', fieldErrors: [{ field: 'description', reason: 'tooShort' }] });
    expect(verdictFor({ description: 'x'.repeat(2001) })).toStrictEqual({ outcome: 'refused', fieldErrors: [{ field: 'description', reason: 'tooLong' }] });
  });

  it('collects every failure in one refused verdict', () => {
    expect(verdictFor({ policyId: 'EX-ENDED-CAR', incidentDate: '01-06-2099', description: '' })).toStrictEqual({
      outcome:     'refused',
      fieldErrors: [
        { field: 'policyId', reason: 'notEligible' },
        { field: 'incidentDate', reason: 'invalidFormat' },
        { field: 'description', reason: 'required' },
      ],
    });
  });
});
