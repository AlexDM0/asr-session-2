import type { FieldErrorWire }                                   from '@mijn-duinzicht/api-contract/ApiErrorWire';
import type { ClaimDetailWire, ClaimListWire, ClaimSummaryWire } from '@mijn-duinzicht/api-contract/ClaimWire';
import { RecordReader }                                          from '@mijn-duinzicht/record-reader/RecordReader';

import {
  CLAIM_CATEGORIES,
  type Claim,
  type ClaimCreation,
  claimAwaitsCustomerPhotos,
} from '../../shared/model/Claim';

/** A claim with the name of its policy, which the claims feature joins in from the policies. */
export interface ClaimWithPolicyName {
  readonly claim:      Claim;
  readonly policyName: string;
}

export const CLAIM_CREATION_FIELDS = ['category', 'policyId', 'incidentDate', 'description'] as const;

/** The fields that were read before a wire refusal, so the remaining rules can still be checked and reported together. */
export type ClaimCreationReadFields = { -readonly [Field in keyof ClaimCreation]?: ClaimCreation[Field] };

export type ClaimCreationWireVerdict =
  | { readonly outcome: 'read'; readonly creation: ClaimCreation }
  | { readonly outcome: 'invalid'; readonly fieldErrors: readonly FieldErrorWire[]; readonly readFields: ClaimCreationReadFields };

type FieldReading<Value> =
  | { readonly outcome: 'read'; readonly value: Value }
  | { readonly outcome: 'refused'; readonly fieldError: FieldErrorWire };

/** Absent or `null` is `required`; a present value the reader refuses is `invalidFormat`; `isEmpty` values also count as absent. */
function readField<Value>(
  body: Readonly<Record<string, unknown>>,
  field: string,
  readValue: (reader: RecordReader) => Value,
  isEmpty: (value: Value) => boolean = () => false,
): FieldReading<Value> {
  if (!Object.hasOwn(body, field) || body[field] === null) {
    return { outcome: 'refused', fieldError: { field, reason: 'required' } };
  }
  const reader = new RecordReader(body);
  const value = readValue(reader);
  if (reader.verdictFor(value).outcome === 'invalid') {
    return { outcome: 'refused', fieldError: { field, reason: 'invalidFormat' } };
  }
  return isEmpty(value) ? { outcome: 'refused', fieldError: { field, reason: 'required' } } : { outcome: 'read', value };
}

export const ClaimWireUtil = {
  /** Reads a `ClaimCreationWire` body; the date and description rules are checked later. */
  claimCreationFrom(body: Readonly<Record<string, unknown>>): ClaimCreationWireVerdict {
    const readings = {
      category:     readField(body, 'category', (reader) => reader.oneOf('category', CLAIM_CATEGORIES)),
      policyId:     readField(body, 'policyId', (reader) => reader.string('policyId'), (policyId) => policyId === ''),
      incidentDate: readField(body, 'incidentDate', (reader) => reader.string('incidentDate')),
      description:  readField(body, 'description', (reader) => reader.string('description')),
    };
    const readFields: ClaimCreationReadFields = {};
    const fieldErrors: FieldErrorWire[] = [];
    if (readings.category.outcome === 'read') {
      readFields.category = readings.category.value;
    }
    for (const field of ['policyId', 'incidentDate', 'description'] as const) {
      const reading = readings[field];
      if (reading.outcome === 'read') {
        readFields[field] = reading.value;
      }
    }
    for (const field of CLAIM_CREATION_FIELDS) {
      const reading = readings[field];
      if (reading.outcome === 'refused') {
        fieldErrors.push(reading.fieldError);
      }
    }
    const knownFields: readonly string[] = CLAIM_CREATION_FIELDS;
    for (const key of Object.keys(body)) {
      if (!knownFields.includes(key)) {
        fieldErrors.push({ field: key, reason: 'unknownField' });
      }
    }
    const {
      category, policyId, incidentDate, description,
    } = readFields;
    if (fieldErrors.length > 0 || category === undefined || policyId === undefined || incidentDate === undefined || description === undefined) {
      return { outcome: 'invalid', fieldErrors, readFields };
    }
    return {
      outcome:  'read',
      creation: {
        category, policyId, incidentDate, description,
      },
    };
  },

  claimSummaryWireFor({ claim, policyName }: ClaimWithPolicyName): ClaimSummaryWire {
    return {
      id:                   claim.id,
      title:                claim.title,
      category:             claim.category,
      policyId:             claim.policyId,
      policyName,
      reportedAt:           claim.reportedAt,
      status:               claim.status,
      handlerName:          claim.handlerName,
      stepStates:           claim.steps.map((step) => step.state),
      awaitsCustomerPhotos: claimAwaitsCustomerPhotos(claim),
    };
  },

  claimDetailWireFor({ claim, policyName }: ClaimWithPolicyName): ClaimDetailWire {
    return {
      id:                   claim.id,
      title:                claim.title,
      category:             claim.category,
      policyId:             claim.policyId,
      policyName,
      reportedAt:           claim.reportedAt,
      status:               claim.status,
      handlerName:          claim.handlerName,
      awaitsCustomerPhotos: claimAwaitsCustomerPhotos(claim),
      incidentDate:         claim.incidentDate,
      description:          claim.description,
      photoDeadline:        claim.photoDeadline,
      steps:                claim.steps.map((step) => ({
        title:          step.title,
        description:    step.description,
        state:          step.state,
        waitsForPhotos: step.waitsForPhotos,
      })),
    };
  },

  claimListWireFor(claimsWithPolicyNames: readonly ClaimWithPolicyName[]): ClaimListWire {
    return { claims: claimsWithPolicyNames.map((claimWithPolicyName) => ClaimWireUtil.claimSummaryWireFor(claimWithPolicyName)) };
  },
} as const;
