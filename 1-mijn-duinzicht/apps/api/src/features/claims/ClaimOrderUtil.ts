import { type Claim, claimIsOpen } from '../../shared/model/Claim';

export const ClaimOrderUtil = {
  /** Open claims first, then reported date and time newest first, then id ascending. */
  inListOrder(claims: readonly Claim[]): Claim[] {
    return claims.toSorted((a, b) => {
      if (claimIsOpen(a) !== claimIsOpen(b)) {
        return claimIsOpen(a) ? -1 : 1;
      }
      if (a.reportedAt !== b.reportedAt) {
        return a.reportedAt > b.reportedAt ? -1 : 1;
      }
      return a.id < b.id ? -1 : Number(a.id > b.id);
    });
  },
} as const;
