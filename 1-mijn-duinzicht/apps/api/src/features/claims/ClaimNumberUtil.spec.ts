/**
 * Claim ids count per report year: the next id follows the year's highest sequence,
 * other years are ignored, and a used-up year is refused rather than wrapped.
 */
import { describe, expect, it } from 'bun:test';

import { ClaimNumberUtil } from './ClaimNumberUtil';

describe('ClaimNumberUtil.nextClaimIdFor', () => {
  it('assigns one above the highest sequence of the year, padded to four digits', () => {
    expect(ClaimNumberUtil.nextClaimIdFor(['S-2099-0007', 'S-2099-0041', 'S-2098-0900'], '2099')).toStrictEqual({ outcome: 'assigned', claimId: 'S-2099-0042' });
  });

  it('starts a year without claims at 0001, ignoring the ids of other years', () => {
    expect(ClaimNumberUtil.nextClaimIdFor(['S-2098-0005', 'S-2097-9999'], '2099')).toStrictEqual({ outcome: 'assigned', claimId: 'S-2099-0001' });
  });

  it('refuses a year whose highest sequence is 9999 as exhausted', () => {
    expect(ClaimNumberUtil.nextClaimIdFor(['S-2099-9999'], '2099')).toStrictEqual({ outcome: 'exhausted' });
  });
});
