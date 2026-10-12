export type ClaimNumberVerdict =
  | { readonly outcome: 'assigned'; readonly claimId: string }
  | { readonly outcome: 'exhausted' };

const CLAIM_ID_PATTERN = /^S-(\d{4})-(\d{4})$/;
const HIGHEST_SEQUENCE = 9999;
const SEQUENCE_DIGITS = 4;

/** Claim ids per report year: one above the year's highest sequence, `0001` for a year without claims. */
export const ClaimNumberUtil = Object.freeze({
  nextClaimIdFor(existingClaimIds: readonly string[], reportYear: string): ClaimNumberVerdict {
    const sequencesOfYear = existingClaimIds.flatMap((claimId) => {
      const match = CLAIM_ID_PATTERN.exec(claimId);
      return match?.[1] === reportYear ? [Number(match[2])] : [];
    });
    const nextSequence = Math.max(0, ...sequencesOfYear) + 1;
    if (nextSequence > HIGHEST_SEQUENCE) {
      return { outcome: 'exhausted' };
    }
    return { outcome: 'assigned', claimId: `S-${reportYear}-${String(nextSequence).padStart(SEQUENCE_DIGITS, '0')}` };
  },
});
