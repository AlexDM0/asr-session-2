import { RecordReader }  from '@mijn-duinzicht/record-reader/RecordReader';
import type { Database } from 'bun:sqlite';


import {
  POLICY_KINDS,
  POLICY_STATUSES,
  type Policy,
  type PolicyFact,
} from '../../../shared/model/Policy';
import { type IngestionVerdict, ingestionVerdictFor } from '../IngestionVerdict';

type StatementBindings = Record<string, string | number | null>;

interface PolicyRows {
  readonly policy:               readonly unknown[];
  readonly policy_fact:          readonly unknown[];
  readonly policy_coverage_item: readonly unknown[];
}

/** Reads policies with their ordered facts and coverage items; the list comes in stored `position` order. */
export class PolicyIngestion {
  readonly #connection: Database;

  constructor(connection: Database) {
    this.#connection = connection;
  }

  readPolicies(): IngestionVerdict<readonly Policy[]> {
    return ingestionVerdictFor(PolicyIngestion.#policiesFrom({
      policy:               this.#connection.query<unknown, []>('SELECT * FROM policy ORDER BY position').all(),
      policy_fact:          this.#connection.query<unknown, []>('SELECT * FROM policy_fact ORDER BY policy_id, position').all(),
      policy_coverage_item: this.#connection.query<unknown, []>('SELECT * FROM policy_coverage_item ORDER BY policy_id, position').all(),
    }));
  }

  /** Ids are matched exactly: a differently cased or empty id is `absent`. */
  readPolicy(policyId: string): IngestionVerdict<Policy> {
    const bindings = { policyId };
    const policyRows = this.#connection.query<unknown, StatementBindings>('SELECT * FROM policy WHERE policy_id = $policyId').all(bindings);
    if (policyRows.length === 0) {
      return { outcome: 'absent' };
    }
    const verdict = PolicyIngestion.#policiesFrom({
      policy:               policyRows,
      policy_fact:          this.#connection.query<unknown, StatementBindings>('SELECT * FROM policy_fact WHERE policy_id = $policyId ORDER BY position').all(bindings),
      policy_coverage_item: this.#connection.query<unknown, StatementBindings>('SELECT * FROM policy_coverage_item WHERE policy_id = $policyId ORDER BY position').all(bindings),
    });
    if (verdict.outcome === 'invalid') {
      return verdict;
    }
    const [policy] = verdict.value;
    return policy === undefined ? { outcome: 'absent' } : { outcome: 'found', value: policy };
  }

  static #policiesFrom(rows: PolicyRows) {
    const reader = new RecordReader(rows);
    const factRows = reader.array('policy_fact', (factsReader, index) => factsReader.record(index, (factReader) => ({
      policyId: factReader.nonEmptyString('policy_id'),
      fact:     { label: factReader.nonEmptyString('label'), value: factReader.nonEmptyString('value') },
    })));
    const factRowsByPolicyId = Map.groupBy(factRows, (factRow) => factRow.policyId);
    const coverageRows = reader.array('policy_coverage_item', (coverageReader, index) => coverageReader.record(index, (itemReader) => ({
      policyId:    itemReader.nonEmptyString('policy_id'),
      description: itemReader.nonEmptyString('description'),
    })));
    const coverageRowsByPolicyId = Map.groupBy(coverageRows, (coverageRow) => coverageRow.policyId);
    const policies = reader.array('policy', (policiesReader, index) => policiesReader.record(index, (policyReader): Policy => {
      const id = policyReader.nonEmptyString('policy_id');
      return {
        id,
        kind:                policyReader.oneOf('kind', POLICY_KINDS),
        name:                policyReader.nonEmptyString('name'),
        subtitle:            policyReader.nonEmptyString('subtitle'),
        monthlyPremiumCents: policyReader.integer('monthly_premium_cents', { minimum: 0 }),
        status:              policyReader.oneOf('status', POLICY_STATUSES),
        facts:               (factRowsByPolicyId.get(id) ?? []).map((factRow): PolicyFact => factRow.fact),
        coverage:            (coverageRowsByPolicyId.get(id) ?? []).map((coverageRow) => coverageRow.description),
      };
    }));
    return reader.verdictFor<readonly Policy[]>(policies);
  }
}
