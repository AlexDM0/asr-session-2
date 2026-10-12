import { RecordReader } from '@mijn-duinzicht/record-reader/RecordReader';

import { type JsonAnswer, requestJson } from '../lib/http-json/requestJson';
import type { ReadVerdict }             from '../lib/resource/ReadVerdict';

/** Reads the answer body into the client model; every field goes through the reader, so a malformed answer fails the read. */
export type AnswerBodyReader<Value> = (reader: RecordReader) => Value;

const OK_STATUS = 200;
const NOT_FOUND_STATUS = 404;

function errorCodeOf(body: unknown): string {
  const reader = new RecordReader(body);
  return reader.record('error', (errorReader) => errorReader.string('code'));
}

export const ApiReadUtil = {
  /** 200 with a body the reader accepts → found; 404 `notFound` → notFound; anything else → failed. */
  verdictFor<Value>(answer: JsonAnswer, readBody: AnswerBodyReader<Value>): ReadVerdict<Value> {
    if (answer.outcome === 'unreachable') {
      return { outcome: 'failed', reason: 'The API could not be reached.' };
    }
    if (answer.outcome === 'malformedBody') {
      return { outcome: 'failed', reason: `The API answered status ${answer.status} with a body that is not JSON.` };
    }
    if (answer.status === NOT_FOUND_STATUS && errorCodeOf(answer.body) === 'notFound') {
      return { outcome: 'notFound' };
    }
    if (answer.status !== OK_STATUS) {
      return { outcome: 'failed', reason: `The API answered status ${answer.status}.` };
    }
    const reader = new RecordReader(answer.body);
    const verdict = reader.verdictFor(readBody(reader));
    if (verdict.outcome === 'invalid') {
      return { outcome: 'failed', reason: `The answer is malformed at ${verdict.failedPaths.join(', ')}.` };
    }
    return { outcome: 'found', value: verdict.value };
  },

  /** A read without an id (a list or the customer's own data), where a not-found answer can only mean a failure. */
  async readResource<Value>(address: string, signal: AbortSignal, readBody: AnswerBodyReader<Value>): Promise<ReadVerdict<Value>> {
    const verdict = ApiReadUtil.verdictFor(await requestJson({ address, signal }), readBody);
    return verdict.outcome === 'notFound' ? { outcome: 'failed', reason: `The API answered not-found for ${address}.` } : verdict;
  },
} as const;
