import type { RecordVerdict } from '@mijn-duinzicht/record-reader/RecordReader';

import { PortalError } from '../../shared/errors/PortalError';

/** What a store read found: the internal model, no row for that id, or stored values that fail validation (fail closed). */
export type IngestionVerdict<Value> =
  | { readonly outcome: 'found'; readonly value: Value }
  | { readonly outcome: 'absent' }
  | { readonly outcome: 'invalid'; readonly failedPaths: readonly string[] };

export function ingestionVerdictFor<Value>(recordVerdict: RecordVerdict<Value>): IngestionVerdict<Value> {
  if (recordVerdict.outcome === 'invalid') {
    return recordVerdict;
  }
  return { outcome: 'found', value: recordVerdict.value };
}

/** The found value, `undefined` when absent; invalid stored values throw `invalidStoredValue`, which rolls the store call back. */
export function foundValueOf<Value>(verdict: IngestionVerdict<Value>, subject: string): Value | undefined {
  if (verdict.outcome === 'invalid') {
    throw new PortalError('unrepaired', 'invalidStoredValue', `The stored ${subject} is invalid at ${verdict.failedPaths.join(', ')}.`);
  }
  return verdict.outcome === 'found' ? verdict.value : undefined;
}
