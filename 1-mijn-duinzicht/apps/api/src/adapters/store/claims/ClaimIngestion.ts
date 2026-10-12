import { RecordReader }  from '@mijn-duinzicht/record-reader/RecordReader';
import type { Database } from 'bun:sqlite';


import {
  CLAIM_CATEGORIES,
  CLAIM_STATUSES,
  CLAIM_STEP_STATES,
  type Claim,
  type ClaimStep,
  claimAwaitsCustomerPhotos,
} from '../../../shared/model/Claim';
import { type IngestionVerdict, ingestionVerdictFor } from '../IngestionVerdict';

type StatementBindings = Record<string, string | number | null>;

interface ClaimRows {
  readonly claim:      readonly unknown[];
  readonly claim_step: readonly unknown[];
}

/**
 * Reads claims with their ordered steps. Beyond the column checks it refuses two stored states the
 * derived values cannot work with: more than one current step, and a photo wait without a deadline.
 */
export class ClaimIngestion {
  readonly #connection: Database;

  constructor(connection: Database) {
    this.#connection = connection;
  }

  readClaims(): IngestionVerdict<readonly Claim[]> {
    return ClaimIngestion.#claimsFrom({
      claim:      this.#connection.query<unknown, []>('SELECT * FROM claim ORDER BY claim_id').all(),
      claim_step: this.#connection.query<unknown, []>('SELECT * FROM claim_step ORDER BY claim_id, position').all(),
    });
  }

  /** Ids are matched exactly: a differently cased or empty id is `absent`. */
  readClaim(claimId: string): IngestionVerdict<Claim> {
    const bindings = { claimId };
    const claimRows = this.#connection.query<unknown, StatementBindings>('SELECT * FROM claim WHERE claim_id = $claimId').all(bindings);
    if (claimRows.length === 0) {
      return { outcome: 'absent' };
    }
    const verdict = ClaimIngestion.#claimsFrom({
      claim:      claimRows,
      claim_step: this.#connection.query<unknown, StatementBindings>('SELECT * FROM claim_step WHERE claim_id = $claimId ORDER BY position').all(bindings),
    });
    if (verdict.outcome !== 'found') {
      return verdict;
    }
    const [claim] = verdict.value;
    return claim === undefined ? { outcome: 'absent' } : { outcome: 'found', value: claim };
  }

  static #claimsFrom(rows: ClaimRows): IngestionVerdict<readonly Claim[]> {
    const reader = new RecordReader(rows);
    const stepRows = reader.array('claim_step', (stepsReader, index) => stepsReader.record(index, (stepReader) => ({
      claimId: stepReader.nonEmptyString('claim_id'),
      step:    {
        title:          stepReader.nonEmptyString('title'),
        description:    stepReader.string('description'),
        state:          stepReader.oneOf('state', CLAIM_STEP_STATES),
        waitsForPhotos: stepReader.integer('waits_for_photos', { minimum: 0, maximum: 1 }) === 1,
      },
    })));
    const stepRowsByClaimId = Map.groupBy(stepRows, (stepRow) => stepRow.claimId);
    const claims = reader.array('claim', (claimsReader, index) => claimsReader.record(index, (claimReader): Claim => {
      const id = claimReader.nonEmptyString('claim_id');
      return {
        id,
        title:         claimReader.nonEmptyString('title'),
        category:      claimReader.oneOf('category', CLAIM_CATEGORIES),
        policyId:      claimReader.nonEmptyString('policy_id'),
        reportedAt:    claimReader.localDateTime('reported_at'),
        status:        claimReader.oneOf('status', CLAIM_STATUSES),
        handlerName:   claimReader.nullable('handler_name', (handlerReader, key) => handlerReader.nonEmptyString(key)),
        incidentDate:  claimReader.nullable('incident_date', (dateReader, key) => dateReader.calendarDate(key)),
        description:   claimReader.nullable('description', (descriptionReader, key) => descriptionReader.string(key)),
        photoDeadline: claimReader.nullable('photo_deadline', (dateReader, key) => dateReader.calendarDate(key)),
        steps:         (stepRowsByClaimId.get(id) ?? []).map((stepRow): ClaimStep => stepRow.step),
      };
    }));
    const verdict = ingestionVerdictFor(reader.verdictFor<readonly Claim[]>(claims));
    if (verdict.outcome !== 'found') {
      return verdict;
    }
    const inconsistentPaths = claims.flatMap((claim, index) => ClaimIngestion.#inconsistentPathsOf(claim, index));
    return inconsistentPaths.length > 0 ? { outcome: 'invalid', failedPaths: inconsistentPaths } : verdict;
  }

  static #inconsistentPathsOf(claim: Claim, index: number): string[] {
    const inconsistentPaths: string[] = [];
    if (claim.steps.filter((step) => step.state === 'current').length > 1) {
      inconsistentPaths.push(`claim[${index}].steps`);
    }
    if (claimAwaitsCustomerPhotos(claim) && claim.photoDeadline === null) {
      inconsistentPaths.push(`claim[${index}].photo_deadline`);
    }
    return inconsistentPaths;
  }
}
