import type { RecordReader } from '@mijn-duinzicht/record-reader/RecordReader';

import type { ReadVerdict }   from '../lib/resource/ReadVerdict';
import type { PolicySummary } from '../shared/model/Policy';

import { ApiReadUtil } from './ApiReadUtil';

const POLICY_KINDS = ['home', 'contents', 'car', 'liability'] as const;
const POLICY_STATUSES = ['active', 'ended'] as const;

function policySummaryFrom(reader: RecordReader): PolicySummary {
  return {
    id:                  reader.nonEmptyString('id'),
    policyNumber:        reader.nonEmptyString('policyNumber'),
    kind:                reader.oneOf('kind', POLICY_KINDS),
    name:                reader.nonEmptyString('name'),
    subtitle:            reader.nonEmptyString('subtitle'),
    monthlyPremiumCents: reader.integer('monthlyPremiumCents', { minimum: 0 }),
    status:              reader.oneOf('status', POLICY_STATUSES),
  };
}

export function loadPolicies(signal: AbortSignal): Promise<ReadVerdict<readonly PolicySummary[]>> {
  return ApiReadUtil.readResource('/api/policies', signal, (reader) => reader.array(
    'policies',
    (policiesReader, index) => policiesReader.record(index, policySummaryFrom),
  ));
}
