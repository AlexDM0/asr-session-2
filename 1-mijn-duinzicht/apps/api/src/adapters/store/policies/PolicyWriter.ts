import type { Database } from 'bun:sqlite';

import type { Policy } from '../../../shared/model/Policy';

type StatementBindings = Record<string, string | number | null>;

export interface PolicyWriter {
  /** `position` is the policy's place in the seed order, from 1. */
  insertPolicy(customerNumber: string, policy: Policy, position: number): void;
}

export function createPolicyWriter(connection: Database): PolicyWriter {
  return {
    insertPolicy(customerNumber, policy, position) {
      connection.query<never, StatementBindings>(
        `INSERT INTO policy (policy_id, customer_number, position, kind, name, subtitle, monthly_premium_cents, status)
         VALUES ($policyId, $customerNumber, $position, $kind, $name, $subtitle, $monthlyPremiumCents, $status)`,
      ).run({
        policyId:            policy.id,
        customerNumber,
        position,
        kind:                policy.kind,
        name:                policy.name,
        subtitle:            policy.subtitle,
        monthlyPremiumCents: policy.monthlyPremiumCents,
        status:              policy.status,
      });
      const insertFact = connection.query<never, StatementBindings>(
        'INSERT INTO policy_fact (policy_id, position, label, value) VALUES ($policyId, $position, $label, $value)',
      );
      policy.facts.forEach((fact, index) => {
        insertFact.run({
          policyId: policy.id, position: index + 1, label: fact.label, value: fact.value,
        });
      });
      const insertCoverageItem = connection.query<never, StatementBindings>(
        'INSERT INTO policy_coverage_item (policy_id, position, description) VALUES ($policyId, $position, $description)',
      );
      policy.coverage.forEach((description, index) => {
        insertCoverageItem.run({ policyId: policy.id, position: index + 1, description });
      });
    },
  };
}
