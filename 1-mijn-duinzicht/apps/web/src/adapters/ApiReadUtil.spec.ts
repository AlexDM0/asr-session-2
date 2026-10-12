/**
 * Every adapter turns transport answers into read verdicts through this util, so its table is pinned:
 * 200 with a valid body is found, 404 `notFound` is notFound, and anything else (another status, a 404
 * from the proxy, no answer, a body that is not JSON or fails the reader) is failed.
 */
import type { RecordReader }    from '@mijn-duinzicht/record-reader/RecordReader';
import { describe, expect, it } from 'bun:test';


import { ApiReadUtil } from './ApiReadUtil';

function exampleBodyReader(reader: RecordReader): { exampleField: string } {
  return { exampleField: reader.nonEmptyString('exampleField') };
}

describe('ApiReadUtil.verdictFor', () => {
  it('answers found for status 200 with a body the reader accepts', () => {
    expect(ApiReadUtil.verdictFor({ outcome: 'answered', status: 200, body: { exampleField: 'example' } }, exampleBodyReader)).toEqual({
      outcome: 'found',
      value:   { exampleField: 'example' },
    });
  });

  it('answers notFound for 404 with the error code notFound', () => {
    const answer = { outcome: 'answered', status: 404, body: { error: { code: 'notFound', message: 'No example.' } } } as const;

    expect(ApiReadUtil.verdictFor(answer, exampleBodyReader)).toEqual({ outcome: 'notFound' });
  });

  it('answers failed for a 404 with another code, such as an unknown route', () => {
    const answer = { outcome: 'answered', status: 404, body: { error: { code: 'routeNotFound', message: 'No route.' } } } as const;

    expect(ApiReadUtil.verdictFor(answer, exampleBodyReader).outcome).toBe('failed');
  });

  it('answers failed for any other status, including 502 apiUnreachable from the proxy and 500', () => {
    for (const [status, code] of [[502, 'apiUnreachable'], [500, 'invalidStoredValue'], [405, 'operationNotOffered']] as const) {
      const answer = { outcome: 'answered', status, body: { error: { code, message: 'Example.' } } } as const;

      expect(ApiReadUtil.verdictFor(answer, exampleBodyReader).outcome).toBe('failed');
    }
  });

  it('answers failed when the API cannot be reached or answers with a body that is not JSON', () => {
    expect(ApiReadUtil.verdictFor({ outcome: 'unreachable' }, exampleBodyReader).outcome).toBe('failed');
    expect(ApiReadUtil.verdictFor({ outcome: 'malformedBody', status: 200 }, exampleBodyReader).outcome).toBe('failed');
  });

  it('answers failed, naming the failing path, for a 200 body the reader refuses', () => {
    const verdict = ApiReadUtil.verdictFor({ outcome: 'answered', status: 200, body: { exampleField: 42 } }, exampleBodyReader);

    expect(verdict).toEqual({ outcome: 'failed', reason: 'The answer is malformed at exampleField.' });
  });
});
