/**
 * Bun passes a request whose method a route does not offer on to the next matching route, so the
 * composition must answer every missing method itself. The cases that matter: tables merge, every
 * method a path lacks gets the not-offered handler, and a path declared twice for one method is refused.
 */
import type { BunRequest }      from 'bun';
import { describe, expect, it } from 'bun:test';

import { type RouteHandler, composeRouteTables } from './composeRouteTables';

const exampleRequest = new Request('http://localhost/example') as BunRequest;

function answering(text: string): RouteHandler {
  return () => new Response(text);
}

async function answerOf(handler: RouteHandler | undefined): Promise<string> {
  return handler === undefined ? 'no handler' : (await handler(exampleRequest)).text();
}

describe('composeRouteTables', () => {
  it('merges the paths of several tables and keeps each offered handler', async () => {
    const verdict = composeRouteTables([
      { '/example/one': { GET: answering('one') } },
      { '/example/two': { GET: answering('two'), DELETE: answering('two removed') } },
    ], answering('not offered'));

    expect(verdict.outcome).toBe('composed');
    const routes = verdict.outcome === 'composed' ? verdict.routes : {};
    expect(Object.keys(routes)).toEqual(['/example/one', '/example/two']);
    expect(await answerOf(routes['/example/one']?.GET)).toBe('one');
    expect(await answerOf(routes['/example/two']?.DELETE)).toBe('two removed');
  });

  it('fills every method a path does not offer with the not-offered handler', async () => {
    const verdict = composeRouteTables([{ '/example': { GET: answering('example') } }], answering('not offered'));
    const handlers = verdict.outcome === 'composed' ? verdict.routes['/example'] : undefined;

    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const) {
      expect(await answerOf(handlers?.[method])).toBe('not offered');
    }
  });

  it('answers every method as not offered on a path declared with no methods', async () => {
    const verdict = composeRouteTables([{ '/example/reserved': {} }], answering('not offered'));
    const handlers = verdict.outcome === 'composed' ? verdict.routes['/example/reserved'] : undefined;

    expect(await answerOf(handlers?.GET)).toBe('not offered');
    expect(await answerOf(handlers?.PUT)).toBe('not offered');
  });

  it('merges one path declared by two tables with different methods', async () => {
    const verdict = composeRouteTables([
      { '/example': { GET: answering('read') } },
      { '/example': { PUT: answering('write') } },
    ], answering('not offered'));
    const handlers = verdict.outcome === 'composed' ? verdict.routes['/example'] : undefined;

    expect(await answerOf(handlers?.GET)).toBe('read');
    expect(await answerOf(handlers?.PUT)).toBe('write');
  });

  it('refuses a path declared twice for the same method, naming both', () => {
    const verdict = composeRouteTables([
      { '/example': { GET: answering('first') } },
      { '/example': { GET: answering('second') } },
    ], answering('not offered'));

    expect(verdict).toEqual({ outcome: 'duplicate', path: '/example', method: 'GET' });
  });
});
