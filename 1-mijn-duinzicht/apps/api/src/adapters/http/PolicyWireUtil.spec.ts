/**
 * The wire util pins the policy list and detail answers: the policy number equals the id, the list leaves
 * out facts and coverage, and the detail keeps their order.
 */
import type { PolicySummaryWire } from '@mijn-duinzicht/api-contract/PolicyWire';
import { describe, expect, it }   from 'bun:test';


import type { Policy } from '../../shared/model/Policy';

import { PolicyWireUtil } from './PolicyWireUtil';

const EXAMPLE_POLICY: Policy = {
  id:                  'EX-POLICY-1',
  kind:                'contents',
  name:                'Example policy',
  subtitle:            'Example subtitle',
  monthlyPremiumCents: 4321,
  status:              'ended',
  facts:               [{ label: 'Example label 1', value: 'Example value 1' }, { label: 'Example label 2', value: 'Example value 2' }],
  coverage:            ['Example coverage 1', 'Example coverage 2'],
};

const EXPECTED_SUMMARY: PolicySummaryWire = {
  id:                  'EX-POLICY-1',
  policyNumber:        'EX-POLICY-1',
  kind:                'contents',
  name:                'Example policy',
  subtitle:            'Example subtitle',
  monthlyPremiumCents: 4321,
  status:              'ended',
};

describe('PolicyWireUtil', () => {
  it('maps a policy to the summary fields, with the id as policy number', () => {
    expect(PolicyWireUtil.policySummaryWireFor(EXAMPLE_POLICY)).toStrictEqual(EXPECTED_SUMMARY);
  });

  it('adds the ordered facts and coverage to the detail', () => {
    expect(PolicyWireUtil.policyDetailWireFor(EXAMPLE_POLICY)).toStrictEqual({
      ...EXPECTED_SUMMARY,
      facts:    [{ label: 'Example label 1', value: 'Example value 1' }, { label: 'Example label 2', value: 'Example value 2' }],
      coverage: ['Example coverage 1', 'Example coverage 2'],
    });
  });

  it('wraps the summaries in a policies list in the given order', () => {
    const secondPolicy = { ...EXAMPLE_POLICY, id: 'EX-POLICY-0' };

    expect(PolicyWireUtil.policyListWireFor([EXAMPLE_POLICY, secondPolicy]).policies.map((policy) => policy.id)).toEqual(['EX-POLICY-1', 'EX-POLICY-0']);
  });
});
