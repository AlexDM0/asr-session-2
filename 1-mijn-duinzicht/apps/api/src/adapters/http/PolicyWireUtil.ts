import type { PolicyDetailWire, PolicyListWire, PolicySummaryWire } from '@mijn-duinzicht/api-contract/PolicyWire';

import type { Policy } from '../../shared/model/Policy';

export const PolicyWireUtil = {
  /** The policy number is the policy id, sent under both names. */
  policySummaryWireFor(policy: Policy): PolicySummaryWire {
    return {
      id:                  policy.id,
      policyNumber:        policy.id,
      kind:                policy.kind,
      name:                policy.name,
      subtitle:            policy.subtitle,
      monthlyPremiumCents: policy.monthlyPremiumCents,
      status:              policy.status,
    };
  },

  policyDetailWireFor(policy: Policy): PolicyDetailWire {
    return {
      ...PolicyWireUtil.policySummaryWireFor(policy),
      facts:    policy.facts.map((fact) => ({ label: fact.label, value: fact.value })),
      coverage: [...policy.coverage],
    };
  },

  policyListWireFor(policies: readonly Policy[]): PolicyListWire {
    return { policies: policies.map((policy) => PolicyWireUtil.policySummaryWireFor(policy)) };
  },
} as const;
