/** The wire util pins the open-actions answer: each action is a union member on `kind` carrying exactly its own fields. */
import { describe, expect, it } from 'bun:test';

import { OpenActionWireUtil } from './OpenActionWireUtil';

describe('OpenActionWireUtil', () => {
  it('maps both kinds of open action to their exact field names, keeping the order', () => {
    expect(OpenActionWireUtil.openActionListWireFor([
      {
        kind: 'uploadClaimPhotos', claimId: 'S-2099-0001', claimTitle: 'Example claim', deadline: '2099-01-10',
      },
      { kind: 'confirmEmailAddress', lastConfirmedYear: 2020 },
    ])).toStrictEqual({
      openActions: [
        {
          kind: 'uploadClaimPhotos', claimId: 'S-2099-0001', claimTitle: 'Example claim', deadline: '2099-01-10',
        },
        { kind: 'confirmEmailAddress', lastConfirmedYear: 2020 },
      ],
    });
  });

  it('wraps an empty list as an empty openActions array', () => {
    expect(OpenActionWireUtil.openActionListWireFor([])).toStrictEqual({ openActions: [] });
  });
});
