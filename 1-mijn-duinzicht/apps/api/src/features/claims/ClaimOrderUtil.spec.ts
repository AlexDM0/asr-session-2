/**
 * The claim order decides which claim a list shows first. The cases that matter: an open
 * claim (reported or inProgress) beats any closed one however recent, then newest first, and the id
 * breaks a tie.
 */
import { describe, expect, it } from 'bun:test';

import { syntheticClaim } from '../../shared/model/syntheticClaim.setup';

import { ClaimOrderUtil } from './ClaimOrderUtil';

describe('ClaimOrderUtil.inListOrder', () => {
  it('puts open claims before closed ones, even when a closed claim is more recent', () => {
    const recentClosedClaim = syntheticClaim({ id: 'S-2099-0001', status: 'paidOut', reportedAt: '2099-12-31T23:59' });
    const olderReportedClaim = syntheticClaim({ id: 'S-2099-0002', status: 'reported', reportedAt: '2099-01-01T00:00' });
    const olderInProgressClaim = syntheticClaim({ id: 'S-2099-0003', status: 'inProgress', reportedAt: '2099-01-01T00:01' });
    const rejectedClaim = syntheticClaim({ id: 'S-2099-0004', status: 'rejected', reportedAt: '2099-06-01T00:00' });

    const ordered = ClaimOrderUtil.inListOrder([recentClosedClaim, olderReportedClaim, olderInProgressClaim, rejectedClaim]);

    expect(ordered.map((claim) => claim.id)).toEqual(['S-2099-0003', 'S-2099-0002', 'S-2099-0001', 'S-2099-0004']);
  });

  it('orders by reported date and time newest first, comparing the minutes too', () => {
    const ordered = ClaimOrderUtil.inListOrder([
      syntheticClaim({ id: 'S-2099-0001', reportedAt: '2099-05-05T10:00' }),
      syntheticClaim({ id: 'S-2099-0002', reportedAt: '2099-05-05T10:01' }),
      syntheticClaim({ id: 'S-2098-0003', reportedAt: '2098-05-05T10:01' }),
    ]);

    expect(ordered.map((claim) => claim.id)).toEqual(['S-2099-0002', 'S-2099-0001', 'S-2098-0003']);
  });

  it('breaks a tie on status group and moment by id ascending', () => {
    const ordered = ClaimOrderUtil.inListOrder([
      syntheticClaim({ id: 'S-2099-0009' }),
      syntheticClaim({ id: 'S-2099-0001' }),
    ]);

    expect(ordered.map((claim) => claim.id)).toEqual(['S-2099-0001', 'S-2099-0009']);
  });
});
