/**
 * The transport turns every outcome of `fetch` into a verdict, so the cases that matter: a JSON
 * answer with its status, no answer at all, an answer that is not JSON, and the GET request it sends
 * with the caller's signal.
 */
import { describe, expect, it } from 'bun:test';

import { requestJson } from './requestJson';

interface RecordedRequest {
  readonly address: string;
  readonly init:    RequestInit;
}

function fetchAnswering(answer: () => Response, recordedRequests: RecordedRequest[] = []): typeof fetch {
  const fetchStub = async (input: RequestInfo | URL, init?: RequestInit) => {
    recordedRequests.push({ address: String(input), init: init ?? {} });
    return answer();
  };
  return fetchStub as typeof fetch;
}

const EXAMPLE_SIGNAL = new AbortController().signal;

describe('requestJson', () => {
  it('answers with the status and the parsed body', async () => {
    const answer = await requestJson({
      address:             '/api/example',
      signal:              EXAMPLE_SIGNAL,
      fetchImplementation: fetchAnswering(() => Response.json({ exampleField: 'example' }, { status: 201 })),
    });

    expect(answer).toEqual({ outcome: 'answered', status: 201, body: { exampleField: 'example' } });
  });

  it('answers unreachable when fetch rejects, as on a network error or an abort', async () => {
    const rejectingFetch = (async () => {
      throw new TypeError('Example network failure.');
    }) as unknown as typeof fetch;

    expect(await requestJson({ address: '/api/example', signal: EXAMPLE_SIGNAL, fetchImplementation: rejectingFetch })).toEqual({ outcome: 'unreachable' });
  });

  it('answers malformedBody with the status when the body is not JSON', async () => {
    const answer = await requestJson({ address: '/api/example', signal: EXAMPLE_SIGNAL, fetchImplementation: fetchAnswering(() => new Response('not json', { status: 502 })) });

    expect(answer).toEqual({ outcome: 'malformedBody', status: 502 });
  });

  it('sends a GET that accepts JSON and passes the signal', async () => {
    const recordedRequests: RecordedRequest[] = [];
    const abortController = new AbortController();

    await requestJson({ address: '/api/example', signal: abortController.signal, fetchImplementation: fetchAnswering(() => Response.json({}), recordedRequests) });

    const [request] = recordedRequests;
    expect(request?.address).toBe('/api/example');
    expect(request?.init.method).toBe('GET');
    expect(request?.init.body).toBeUndefined();
    expect(new Headers(request?.init.headers).get('accept')).toBe('application/json');
    expect(request?.init.signal).toBe(abortController.signal);
  });

  it('uses the global fetch when none is injected', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchAnswering(() => Response.json({ exampleField: 'global' }));
    try {
      expect(await requestJson({ address: '/api/example', signal: EXAMPLE_SIGNAL })).toEqual({ outcome: 'answered', status: 200, body: { exampleField: 'global' } });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
