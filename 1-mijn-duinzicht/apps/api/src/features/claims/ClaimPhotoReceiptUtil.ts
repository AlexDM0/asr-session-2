import type { Claim, ClaimStep } from '../../shared/model/Claim';

import { NEW_CLAIM_CONTENT } from './newClaimContent';

export type ClaimPhotoReceiptVerdict =
  | { readonly outcome: 'applied'; readonly claim: Claim }
  | { readonly outcome: 'photosNotExpected' };

/** Applies a photo receipt: the waiting step is done, the next step is current, the deadline is cleared. */
export const ClaimPhotoReceiptUtil = Object.freeze({
  claimAfterPhotoReceipt(claim: Claim, photoCount: number): ClaimPhotoReceiptVerdict {
    const waitingStepIndex = claim.steps.findIndex((step) => step.state === 'current' && step.waitsForPhotos);
    if (waitingStepIndex === -1) {
      return { outcome: 'photosNotExpected' };
    }
    const steps = claim.steps.map((step, index): ClaimStep => {
      if (index === waitingStepIndex) {
        return {
          ...step, state: 'done', description: NEW_CLAIM_CONTENT.photosReceived(photoCount), waitsForPhotos: false,
        };
      }
      return index === waitingStepIndex + 1 ? { ...step, state: 'current' } : step;
    });
    return { outcome: 'applied', claim: { ...claim, steps, photoDeadline: null } };
  },
});
