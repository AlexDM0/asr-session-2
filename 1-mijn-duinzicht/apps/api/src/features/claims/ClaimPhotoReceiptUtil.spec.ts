/**
 * A photo receipt changes exactly the waiting step, the next step and the deadline;
 * the status stays, the last step may be the waiting one, and a claim that does not wait is refused.
 */
import { describe, expect, it } from 'bun:test';

import type { ClaimStep } from '../../shared/model/Claim';
import { syntheticClaim } from '../../shared/model/syntheticClaim.setup';

import { ClaimPhotoReceiptUtil } from './ClaimPhotoReceiptUtil';

function step(state: ClaimStep['state'], waitsForPhotos = false): ClaimStep {
  return {
    title: `Example ${state} step`, description: 'Example description', state, waitsForPhotos,
  };
}

const WAITING_CLAIM = syntheticClaim({
  status:        'inProgress',
  photoDeadline: '2099-01-10',
  steps:         [step('done'), step('current', true), step('todo'), step('todo')],
});

describe('ClaimPhotoReceiptUtil.claimAfterPhotoReceipt', () => {
  it('marks the waiting step done with the photo count and makes the next step current', () => {
    const verdict = ClaimPhotoReceiptUtil.claimAfterPhotoReceipt(WAITING_CLAIM, 2);

    expect(verdict).toStrictEqual({
      outcome: 'applied',
      claim:   {
        ...WAITING_CLAIM,
        photoDeadline: null,
        steps:         [
          step('done'),
          {
            title: 'Example current step', description: '2 foto\'s ontvangen', state: 'done', waitsForPhotos: false,
          },
          { ...step('todo'), state: 'current' },
          step('todo'),
        ],
      },
    });
  });

  it('describes a single photo in the singular', () => {
    const verdict = ClaimPhotoReceiptUtil.claimAfterPhotoReceipt(WAITING_CLAIM, 1);

    expect(verdict.outcome === 'applied' ? verdict.claim.steps[1]?.description : undefined).toBe('1 foto ontvangen');
  });

  it('leaves no step current when the waiting step is the last', () => {
    const verdict = ClaimPhotoReceiptUtil.claimAfterPhotoReceipt(syntheticClaim({ photoDeadline: '2099-01-10', steps: [step('done'), step('current', true)] }), 1);

    expect(verdict.outcome === 'applied' ? verdict.claim.steps.map((claimStep) => claimStep.state) : []).toStrictEqual(['done', 'done']);
  });

  it('keeps the status unchanged', () => {
    const verdict = ClaimPhotoReceiptUtil.claimAfterPhotoReceipt(WAITING_CLAIM, 3);

    expect(verdict.outcome === 'applied' ? verdict.claim.status : undefined).toBe('inProgress');
  });

  it('refuses a claim whose current step does not wait for photos', () => {
    const claim = syntheticClaim({ steps: [step('done'), step('current'), step('todo')] });

    expect(ClaimPhotoReceiptUtil.claimAfterPhotoReceipt(claim, 1)).toStrictEqual({ outcome: 'photosNotExpected' });
  });
});
