/**
 * These rules decide the same report on both sides of the wire, so the boundaries matter most:
 * blank text, nine versus ten code points, exactly 2000 including emoji versus 2001, impossible and
 * wrongly ordered dates, today versus tomorrow, and each category's eligible policy kinds.
 */
import { describe, expect, it } from 'bun:test';

import { CLAIM_POLICY_ELIGIBILITY, ClaimReportRuleUtil } from './ClaimReportRuleUtil';

const TODAY = '2026-10-08';

describe('ClaimReportRuleUtil.descriptionVerdictFor', () => {
  it('refuses an empty description as required', () => {
    expect(ClaimReportRuleUtil.descriptionVerdictFor('')).toEqual({ outcome: 'required' });
  });

  it('refuses a description of only spaces and line breaks as required', () => {
    expect(ClaimReportRuleUtil.descriptionVerdictFor('  \n \n  ')).toEqual({ outcome: 'required' });
  });

  it('refuses a description of nine code points as too short', () => {
    expect(ClaimReportRuleUtil.descriptionVerdictFor('  123456789  ')).toEqual({ outcome: 'tooShort' });
  });

  it('accepts ten code points and keeps the inner line breaks of the trimmed text', () => {
    expect(ClaimReportRuleUtil.descriptionVerdictFor('  1234\n56789 ')).toEqual({
      outcome:     'acceptable',
      trimmedText: '1234\n56789',
    });
  });

  it('accepts exactly 2000 code points when some of them are emoji', () => {
    const text = '💧'.repeat(1000) + 'a'.repeat(1000);

    expect(ClaimReportRuleUtil.descriptionVerdictFor(text)).toEqual({ outcome: 'acceptable', trimmedText: text });
  });

  it('refuses 2001 code points as too long', () => {
    expect(ClaimReportRuleUtil.descriptionVerdictFor('💧'.repeat(2001))).toEqual({ outcome: 'tooLong' });
  });
});

describe('ClaimReportRuleUtil.incidentDateVerdictFor', () => {
  it('refuses an impossible calendar date as an invalid format', () => {
    expect(ClaimReportRuleUtil.incidentDateVerdictFor('2026-02-31', TODAY)).toEqual({ outcome: 'invalidFormat' });
  });

  it('refuses a day-month-year date as an invalid format', () => {
    expect(ClaimReportRuleUtil.incidentDateVerdictFor('01-10-2026', TODAY)).toEqual({ outcome: 'invalidFormat' });
  });

  it('refuses a text that is no date as an invalid format', () => {
    expect(ClaimReportRuleUtil.incidentDateVerdictFor('example', TODAY)).toEqual({ outcome: 'invalidFormat' });
  });

  it('accepts today itself', () => {
    expect(ClaimReportRuleUtil.incidentDateVerdictFor(TODAY, TODAY)).toEqual({ outcome: 'acceptable' });
  });

  it('refuses the day after today as in the future', () => {
    expect(ClaimReportRuleUtil.incidentDateVerdictFor('2026-10-09', TODAY)).toEqual({ outcome: 'inFuture' });
  });
});

describe('CLAIM_POLICY_ELIGIBILITY', () => {
  it('maps every category to its eligible policy kinds', () => {
    expect(CLAIM_POLICY_ELIGIBILITY).toEqual({
      home:      ['home', 'contents'],
      car:       ['car'],
      travel:    ['contents'],
      liability: ['liability'],
    });
  });

  it('is frozen, including each list of policy kinds', () => {
    expect(Object.isFrozen(CLAIM_POLICY_ELIGIBILITY)).toBe(true);
    expect(Object.values(CLAIM_POLICY_ELIGIBILITY).every((policyKinds) => Object.isFrozen(policyKinds))).toBe(true);
  });
});
