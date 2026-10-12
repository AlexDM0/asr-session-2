/**
 * The write features share this reader, so each branch matters: an object only for the JSON media
 * type (parameters allowed) with a JSON object inside; anything else, including valid JSON that is an
 * array or null, is malformed.
 */
import { describe, expect, it } from 'bun:test';

import { jsonRequestBodyVerdictFor } from './JsonRequestBody';

function requestWith(contentType: string | null, body: string): Request {
  const headers = new Headers();
  if (contentType !== null) {
    headers.set('content-type', contentType);
  }
  return new Request('http://localhost/example', { method: 'POST', headers, body });
}

describe('jsonRequestBodyVerdictFor', () => {
  it('reads a JSON object sent as application/json', async () => {
    expect(await jsonRequestBodyVerdictFor(requestWith('application/json', '{"exampleField":"example"}'))).toEqual({
      outcome: 'object',
      body:    { exampleField: 'example' },
    });
  });

  it('allows media type parameters such as charset and is not case-sensitive about the media type', async () => {
    expect((await jsonRequestBodyVerdictFor(requestWith('application/json; charset=utf-8', '{}'))).outcome).toBe('object');
    expect((await jsonRequestBodyVerdictFor(requestWith('Application/JSON', '{}'))).outcome).toBe('object');
  });

  it('refuses another media type or a missing one', async () => {
    expect(await jsonRequestBodyVerdictFor(requestWith('text/plain', '{}'))).toEqual({ outcome: 'malformed' });
    expect(await jsonRequestBodyVerdictFor(requestWith(null, '{}'))).toEqual({ outcome: 'malformed' });
  });

  it('refuses text that is not valid JSON', async () => {
    expect(await jsonRequestBodyVerdictFor(requestWith('application/json', '{example'))).toEqual({ outcome: 'malformed' });
  });

  it('refuses valid JSON that is an array, null or a plain value', async () => {
    for (const body of ['[]', 'null', '"example"', '42']) {
      expect(await jsonRequestBodyVerdictFor(requestWith('application/json', body))).toEqual({ outcome: 'malformed' });
    }
  });
});
