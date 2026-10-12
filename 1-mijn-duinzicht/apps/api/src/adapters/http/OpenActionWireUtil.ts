import type { OpenActionListWire, OpenActionWire } from '@mijn-duinzicht/api-contract/OpenActionWire';

import type { OpenAction } from '../../shared/model/OpenAction';

export const OpenActionWireUtil = {
  openActionWireFor(openAction: OpenAction): OpenActionWire {
    if (openAction.kind === 'uploadClaimPhotos') {
      return {
        kind:       'uploadClaimPhotos',
        claimId:    openAction.claimId,
        claimTitle: openAction.claimTitle,
        deadline:   openAction.deadline,
      };
    }
    return { kind: 'confirmEmailAddress', lastConfirmedYear: openAction.lastConfirmedYear };
  },

  openActionListWireFor(openActions: readonly OpenAction[]): OpenActionListWire {
    return { openActions: openActions.map((openAction) => OpenActionWireUtil.openActionWireFor(openAction)) };
  },
} as const;
