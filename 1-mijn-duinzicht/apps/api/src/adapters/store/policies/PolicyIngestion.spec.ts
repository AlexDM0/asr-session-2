/**
 * Covers the policy writer through the ingestion. What matters: policies come back in stored
 * position order with their ordered facts and coverage, ids are matched exactly (an unknown, empty or
 * differently cased id is `absent`), and a corrupted kind or amount fails closed with its path.
 */
import type { Database } from 'bun:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import type { Policy }                                                                            from '../../../shared/model/Policy';
import { SYNTHETIC_PROFILE, corruptStoredValue, openScratchStoreConnectionWithSyntheticCustomer } from '../scratchStoreConnection.setup';

import { PolicyIngestion }    from './PolicyIngestion';
import { createPolicyWriter } from './PolicyWriter';

const FIRST_POLICY: Policy = {
  id:                  'EX-POLICY-B',
  kind:                'car',
  name:                'Example car policy',
  subtitle:            'Example subtitle',
  monthlyPremiumCents: 1234,
  status:              'active',
  facts:               [{ label: 'Example label 1', value: 'Example value 1' }, { label: 'Example label 2', value: 'Example value 2' }],
  coverage:            ['Example coverage 1', 'Example coverage 2'],
};

const SECOND_POLICY: Policy = {
  id:                  'EX-POLICY-A',
  kind:                'liability',
  name:                'Example liability policy',
  subtitle:            'Example subtitle',
  monthlyPremiumCents: 0,
  status:              'ended',
  facts:               [],
  coverage:            [],
};

let connection: Database;

beforeEach(() => {
  connection = openScratchStoreConnectionWithSyntheticCustomer();
  const writer = createPolicyWriter(connection);
  writer.insertPolicy(SYNTHETIC_PROFILE.customerNumber, FIRST_POLICY, 1);
  writer.insertPolicy(SYNTHETIC_PROFILE.customerNumber, SECOND_POLICY, 2);
});

afterEach(() => {
  connection.close();
});

describe('PolicyIngestion', () => {
  it('reads every policy back in stored position order, not id order', () => {
    expect(new PolicyIngestion(connection).readPolicies()).toEqual({ outcome: 'found', value: [FIRST_POLICY, SECOND_POLICY] });
  });

  it('reads one policy by its exact id with its ordered facts and coverage', () => {
    expect(new PolicyIngestion(connection).readPolicy('EX-POLICY-B')).toEqual({ outcome: 'found', value: FIRST_POLICY });
  });

  it('answers absent for an unknown, empty or differently cased id', () => {
    const ingestion = new PolicyIngestion(connection);

    expect(ingestion.readPolicy('EX-POLICY-Z')).toEqual({ outcome: 'absent' });
    expect(ingestion.readPolicy('')).toEqual({ outcome: 'absent' });
    expect(ingestion.readPolicy('ex-policy-b')).toEqual({ outcome: 'absent' });
  });

  it('fails closed with the path of a kind that is not a known internal value', () => {
    corruptStoredValue(connection, 'UPDATE policy SET kind = \'exampleKind\' WHERE policy_id = \'EX-POLICY-A\'');

    expect(new PolicyIngestion(connection).readPolicies()).toEqual({ outcome: 'invalid', failedPaths: ['policy[1].kind'] });
    expect(new PolicyIngestion(connection).readPolicy('EX-POLICY-A')).toEqual({ outcome: 'invalid', failedPaths: ['policy[0].kind'] });
  });

  it('fails closed on a negative premium and an empty fact value', () => {
    corruptStoredValue(connection, 'UPDATE policy SET monthly_premium_cents = -1 WHERE policy_id = \'EX-POLICY-B\'');
    corruptStoredValue(connection, 'UPDATE policy_fact SET value = \'\' WHERE policy_id = \'EX-POLICY-B\' AND position = 2');

    expect(new PolicyIngestion(connection).readPolicy('EX-POLICY-B')).toEqual({ outcome: 'invalid', failedPaths: ['policy_fact[1].value', 'policy[0].monthly_premium_cents'] });
  });
});
