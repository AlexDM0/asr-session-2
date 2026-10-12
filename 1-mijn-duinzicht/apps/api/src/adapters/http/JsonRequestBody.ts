export type JsonRequestBodyVerdict =
  | { readonly outcome: 'object'; readonly body: Readonly<Record<string, unknown>> }
  | { readonly outcome: 'malformed' };

const JSON_MEDIA_TYPE = 'application/json';

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a JSON request body for the write endpoints: an object only for media type `application/json` (parameters allowed) holding a JSON object. */
export async function jsonRequestBodyVerdictFor(request: Request): Promise<JsonRequestBodyVerdict> {
  const mediaType = (request.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase();
  if (mediaType !== JSON_MEDIA_TYPE) {
    return { outcome: 'malformed' };
  }
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return { outcome: 'malformed' };
  }
  return isPlainObject(body) ? { outcome: 'object', body } : { outcome: 'malformed' };
}
