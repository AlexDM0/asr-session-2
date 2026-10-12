import type { RecordReader } from '@mijn-duinzicht/record-reader/RecordReader';

import type { ReadVerdict }  from '../lib/resource/ReadVerdict';
import type { ClaimSummary } from '../shared/model/Claim';

import { ApiReadUtil } from './ApiReadUtil';

const CLAIM_CATEGORIES = ['home', 'car', 'travel', 'liability'] as const;
const CLAIM_STATUSES = ['reported', 'inProgress', 'paidOut', 'rejected'] as const;
const CLAIM_STEP_STATES = ['done', 'current', 'todo'] as const;

function claimSummaryFrom(reader: RecordReader): ClaimSummary {
  return {
    id:                   reader.nonEmptyString('id'),
    title:                reader.nonEmptyString('title'),
    category:             reader.oneOf('category', CLAIM_CATEGORIES),
    policyId:             reader.nonEmptyString('policyId'),
    policyName:           reader.nonEmptyString('policyName'),
    reportedAt:           reader.localDateTime('reportedAt'),
    status:               reader.oneOf('status', CLAIM_STATUSES),
    handlerName:          reader.nullable('handlerName', (handlerReader, key) => handlerReader.nonEmptyString(key)),
    stepStates:           reader.array('stepStates', (statesReader, index) => statesReader.oneOf(index, CLAIM_STEP_STATES)),
    awaitsCustomerPhotos: reader.boolean('awaitsCustomerPhotos'),
  };
}

export function loadClaims(signal: AbortSignal): Promise<ReadVerdict<readonly ClaimSummary[]>> {
  return ApiReadUtil.readResource('/api/claims', signal, (reader) => reader.array('claims', (claimsReader, index) => claimsReader.record(index, claimSummaryFrom)));
}
