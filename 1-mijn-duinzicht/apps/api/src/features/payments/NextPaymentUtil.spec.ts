/**
 * The derived next payment. The cases that matter: only running (active) policies count towards the
 * amount, the account mask keeps exactly the country code, bank code and last four characters, and no
 * stored schedule means no next payment.
 */
import { describe, expect, it } from 'bun:test';

import type { Policy, PolicyStatus } from '../../shared/model/Policy';

import { NextPaymentUtil } from './NextPaymentUtil';

function syntheticPolicy(monthlyPremiumCents: number, status: PolicyStatus): Policy {
  return {
    id:       `EX-${monthlyPremiumCents}`,
    kind:     'home',
    name:     'Example policy',
    subtitle: 'Example subtitle',
    monthlyPremiumCents,
    status,
    facts:    [],
    coverage: [],
  };
}

describe('NextPaymentUtil', () => {
  it('sums the monthly premiums of the active policies only', () => {
    expect(NextPaymentUtil.amountCentsFor([syntheticPolicy(1001, 'active'), syntheticPolicy(2002, 'ended'), syntheticPolicy(303, 'active')])).toBe(1304);
  });

  it('answers 0 when no policy is active', () => {
    expect(NextPaymentUtil.amountCentsFor([syntheticPolicy(1001, 'ended')])).toBe(0);
  });

  it('masks an IBAN written in groups to country code, bank code and the last four characters', () => {
    expect(NextPaymentUtil.maskedAccountFor('NL00 EXAM 0123 4567 89')).toBe('NL•• EXAM •••• 6789');
  });

  it('masks an IBAN written without spaces the same way', () => {
    expect(NextPaymentUtil.maskedAccountFor('NL00EXAM0123456789')).toBe('NL•• EXAM •••• 6789');
  });

  it('combines the stored collection date with the derived amount and masked account', () => {
    expect(NextPaymentUtil.nextPaymentFor({ nextCollectionDate: '2099-01-01' }, [syntheticPolicy(500, 'active')], 'NL00 EXAM 0000 0000 12')).toEqual({
      collectionDate: '2099-01-01',
      amountCents:    500,
      maskedAccount:  'NL•• EXAM •••• 0012',
    });
  });

  it('gives null when no schedule is stored', () => {
    expect(NextPaymentUtil.nextPaymentFor(null, [syntheticPolicy(500, 'active')], 'NL00 EXAM 0000 0000 12')).toBeNull();
  });
});
