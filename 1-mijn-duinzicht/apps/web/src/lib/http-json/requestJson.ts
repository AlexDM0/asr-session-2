export type JsonAnswer =
  | { readonly outcome: 'answered'; readonly status: number; readonly body: unknown }
  | { readonly outcome: 'unreachable' }
  | { readonly outcome: 'malformedBody'; readonly status: number };

export interface JsonRequest {
  readonly address:              string;
  readonly signal:               AbortSignal;
  readonly fetchImplementation?: typeof fetch;
}

/** Sends one GET request and answers with a verdict instead of throwing: the parsed JSON body, no answer at all, or a body that is not JSON. */
export async function requestJson(request: JsonRequest): Promise<JsonAnswer> {
  const fetchImplementation = request.fetchImplementation ?? globalThis.fetch;
  let response: Response;
  try {
    response = await fetchImplementation(request.address, { method: 'GET', headers: { accept: 'application/json' }, signal: request.signal });
  } catch {
    return { outcome: 'unreachable' };
  }
  try {
    const body: unknown = JSON.parse(await response.text());
    return { outcome: 'answered', status: response.status, body };
  } catch {
    return { outcome: 'malformedBody', status: response.status };
  }
}
