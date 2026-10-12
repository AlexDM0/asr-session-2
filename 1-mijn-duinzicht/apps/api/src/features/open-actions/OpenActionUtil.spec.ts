/**
 * The open-action derivation. The cases that matter: only an open claim whose current step waits for photos
 * yields an upload action (a closed claim or a waiting step that is not current does not), upload
 * actions come by deadline then claim id, the e-mail action comes last, and none applies → empty.
 */
import { describe, expect, it } from 'bun:test';

import { SYNTHETIC_PROFILE } from '../../adapters/store/scratchStoreConnection.setup';
import type { ClaimStep }    from '../../shared/model/Claim';
import { syntheticClaim }    from '../../shared/model/syntheticClaim.setup';

import { OpenActionUtil } from './OpenActionUtil';

const WAITING_STEPS: readonly ClaimStep[] = [
  {
    title: 'Example done step', description: '', state: 'done', waitsForPhotos: false 
  },
  {
    title: 'Example waiting step', description: '', state: 'current', waitsForPhotos: true 
  },
];

const PROFILE_WITHOUT_CONFIRMATION = { ...SYNTHETIC_PROFILE, emailAddressNeedsConfirmation: false };

describe('OpenActionUtil.openActionsFor', () => {
  it('gives one upload action per open claim whose current step waits for photos, ordered by deadline then claim id', () => {
    const openActions = OpenActionUtil.openActionsFor(PROFILE_WITHOUT_CONFIRMATION, [
      syntheticClaim({
        id: 'S-2099-0003', title: 'Example late', status: 'inProgress', photoDeadline: '2099-03-01', steps: WAITING_STEPS 
      }),
      syntheticClaim({
        id: 'S-2099-0002', title: 'Example tie B', status: 'reported', photoDeadline: '2099-02-01', steps: WAITING_STEPS 
      }),
      syntheticClaim({
        id: 'S-2099-0001', title: 'Example tie A', status: 'inProgress', photoDeadline: '2099-02-01', steps: WAITING_STEPS 
      }),
    ]);

    expect(openActions).toEqual([
      {
        kind: 'uploadClaimPhotos', claimId: 'S-2099-0001', claimTitle: 'Example tie A', deadline: '2099-02-01',
      },
      {
        kind: 'uploadClaimPhotos', claimId: 'S-2099-0002', claimTitle: 'Example tie B', deadline: '2099-02-01',
      },
      {
        kind: 'uploadClaimPhotos', claimId: 'S-2099-0003', claimTitle: 'Example late', deadline: '2099-03-01',
      },
    ]);
  });

  it('ignores a closed claim and a claim whose waiting step is not the current one', () => {
    const openActions = OpenActionUtil.openActionsFor(PROFILE_WITHOUT_CONFIRMATION, [
      syntheticClaim({
        id: 'S-2099-0001', status: 'paidOut', photoDeadline: '2099-02-01', steps: WAITING_STEPS 
      }),
      syntheticClaim({
        id:            'S-2099-0002',
        status:        'inProgress',
        photoDeadline: '2099-02-01',
        steps:         [
          {
            title: 'Example current step', description: '', state: 'current', waitsForPhotos: false 
          },
          {
            title: 'Example later waiting step', description: '', state: 'todo', waitsForPhotos: true 
          },
        ],
      }),
    ]);

    expect(openActions).toEqual([]);
  });

  it('adds the e-mail confirmation after the upload actions when the profile is flagged', () => {
    const openActions = OpenActionUtil.openActionsFor({ ...SYNTHETIC_PROFILE, emailAddressNeedsConfirmation: true, emailAddressLastConfirmedYear: 2021 }, [
      syntheticClaim({ status: 'reported', photoDeadline: '2099-02-01', steps: WAITING_STEPS }),
    ]);

    expect(openActions.map((openAction) => openAction.kind)).toEqual(['uploadClaimPhotos', 'confirmEmailAddress']);
    expect(openActions[1]).toEqual({ kind: 'confirmEmailAddress', lastConfirmedYear: 2021 });
  });

  it('gives an empty list when neither applies', () => {
    expect(OpenActionUtil.openActionsFor(PROFILE_WITHOUT_CONFIRMATION, [syntheticClaim({})])).toEqual([]);
  });
});
