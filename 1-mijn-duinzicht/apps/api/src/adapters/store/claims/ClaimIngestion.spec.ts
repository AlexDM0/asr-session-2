/**
 * Covers the claim writer through the ingestion. What matters: claims come back with their ordered
 * steps, ids are matched exactly, a corrupted status or date fails closed, a photo wait without a
 * deadline is refused because the derived open action needs it, and the photo-wait flag follows the
 * current step's `waits_for_photos`.
 */
import type { Database } from 'bun:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { type Claim, claimAwaitsCustomerPhotos }                                                  from '../../../shared/model/Claim';
import { createPolicyWriter }                                                                     from '../policies/PolicyWriter';
import { SYNTHETIC_PROFILE, corruptStoredValue, openScratchStoreConnectionWithSyntheticCustomer } from '../scratchStoreConnection.setup';

import { ClaimIngestion }    from './ClaimIngestion';
import { createClaimWriter } from './ClaimWriter';

const WAITING_CLAIM: Claim = {
  id:            'S-2099-0001',
  title:         'Example waiting claim',
  category:      'home',
  policyId:      'EX-POLICY-1',
  reportedAt:    '2099-01-02T03:04',
  status:        'inProgress',
  handlerName:   'Example Handler',
  incidentDate:  '2099-01-01',
  description:   'Example description',
  photoDeadline: '2099-01-10',
  steps:         [
    {
      title: 'Example step 1', description: 'Example done', state: 'done', waitsForPhotos: false 
    },
    {
      title: 'Example step 2', description: 'Example waiting', state: 'current', waitsForPhotos: true 
    },
    {
      title: 'Example step 3', description: '', state: 'todo', waitsForPhotos: false 
    },
  ],
};

const CLOSED_CLAIM: Claim = {
  id:            'S-2099-0002',
  title:         'Example closed claim',
  category:      'travel',
  policyId:      'EX-POLICY-1',
  reportedAt:    '2099-02-03T04:05',
  status:        'paidOut',
  handlerName:   null,
  incidentDate:  null,
  description:   null,
  photoDeadline: null,
  steps:         [{
    title: 'Example step', description: 'Example done', state: 'done', waitsForPhotos: false 
  }],
};

let connection: Database;

beforeEach(() => {
  connection = openScratchStoreConnectionWithSyntheticCustomer();
  createPolicyWriter(connection).insertPolicy(SYNTHETIC_PROFILE.customerNumber, {
    id:                  'EX-POLICY-1',
    kind:                'home',
    name:                'Example policy',
    subtitle:            'Example subtitle',
    monthlyPremiumCents: 100,
    status:              'active',
    facts:               [],
    coverage:            [],
  }, 1);
  const writer = createClaimWriter(connection);
  writer.insertClaim(SYNTHETIC_PROFILE.customerNumber, WAITING_CLAIM);
  writer.insertClaim(SYNTHETIC_PROFILE.customerNumber, CLOSED_CLAIM);
});

afterEach(() => {
  connection.close();
});

describe('ClaimIngestion', () => {
  it('reads back every claim the writer stored with its ordered steps', () => {
    expect(new ClaimIngestion(connection).readClaims()).toEqual({ outcome: 'found', value: [WAITING_CLAIM, CLOSED_CLAIM] });
  });

  it('reads one claim by its exact id', () => {
    expect(new ClaimIngestion(connection).readClaim('S-2099-0002')).toEqual({ outcome: 'found', value: CLOSED_CLAIM });
  });

  it('answers absent for an unknown, empty or differently cased id', () => {
    const ingestion = new ClaimIngestion(connection);

    expect(ingestion.readClaim('S-2099-0003')).toEqual({ outcome: 'absent' });
    expect(ingestion.readClaim('')).toEqual({ outcome: 'absent' });
    expect(ingestion.readClaim('s-2099-0001')).toEqual({ outcome: 'absent' });
  });

  it('fails closed with the path of a status that is not a known internal value', () => {
    corruptStoredValue(connection, 'UPDATE claim SET status = \'exampleStatus\' WHERE claim_id = \'S-2099-0002\'');

    expect(new ClaimIngestion(connection).readClaims()).toEqual({ outcome: 'invalid', failedPaths: ['claim[1].status'] });
  });

  it('fails closed on a malformed reported date-time and an unknown step state', () => {
    corruptStoredValue(connection, 'UPDATE claim SET reported_at = \'2099-01-02 03:04\' WHERE claim_id = \'S-2099-0001\'');
    corruptStoredValue(connection, 'UPDATE claim_step SET state = \'exampleState\' WHERE claim_id = \'S-2099-0001\' AND position = 3');

    expect(new ClaimIngestion(connection).readClaim('S-2099-0001')).toEqual({ outcome: 'invalid', failedPaths: ['claim_step[2].state', 'claim[0].reported_at'] });
  });

  it('refuses a claim waiting for photos without a stored deadline', () => {
    connection.run('UPDATE claim SET photo_deadline = NULL WHERE claim_id = \'S-2099-0001\'');

    expect(new ClaimIngestion(connection).readClaim('S-2099-0001')).toEqual({ outcome: 'invalid', failedPaths: ['claim[0].photo_deadline'] });
  });

  it('lets the photo-wait flag follow the current step\'s waits_for_photos', () => {
    const ingestion = new ClaimIngestion(connection);
    const waitingVerdict = ingestion.readClaim('S-2099-0001');
    expect(waitingVerdict.outcome === 'found' && claimAwaitsCustomerPhotos(waitingVerdict.value)).toBe(true);

    connection.run('UPDATE claim_step SET waits_for_photos = 0 WHERE claim_id = \'S-2099-0001\' AND position = 2');
    connection.run('UPDATE claim_step SET waits_for_photos = 1 WHERE claim_id = \'S-2099-0001\' AND position = 3');

    const notWaitingVerdict = ingestion.readClaim('S-2099-0001');
    expect(notWaitingVerdict.outcome === 'found' && claimAwaitsCustomerPhotos(notWaitingVerdict.value)).toBe(false);
  });
});
