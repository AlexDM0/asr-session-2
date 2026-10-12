import { type Claim, claimAwaitsCustomerPhotos, claimIsOpen } from '../../shared/model/Claim';
import type { OpenAction, UploadClaimPhotosAction }           from '../../shared/model/OpenAction';
import type { Profile }                                       from '../../shared/model/Profile';

function uploadActionsFor(claim: Claim): UploadClaimPhotosAction[] {
  if (!claimIsOpen(claim) || !claimAwaitsCustomerPhotos(claim) || claim.photoDeadline === null) {
    return [];
  }
  return [{
    kind: 'uploadClaimPhotos', claimId: claim.id, claimTitle: claim.title, deadline: claim.photoDeadline 
  }];
}

export const OpenActionUtil = {
  /** Derived on every read: photo uploads by deadline then claim id, then the e-mail confirmation. No clock is consulted. */
  openActionsFor(profile: Profile, claims: readonly Claim[]): OpenAction[] {
    const uploadActions = claims.flatMap(uploadActionsFor).toSorted((a, b) => {
      if (a.deadline !== b.deadline) {
        return a.deadline < b.deadline ? -1 : 1;
      }
      return a.claimId < b.claimId ? -1 : Number(a.claimId > b.claimId);
    });
    const emailActions: OpenAction[] = profile.emailAddressNeedsConfirmation
      ? [{ kind: 'confirmEmailAddress', lastConfirmedYear: profile.emailAddressLastConfirmedYear }]
      : [];
    return [...uploadActions, ...emailActions];
  },
} as const;
