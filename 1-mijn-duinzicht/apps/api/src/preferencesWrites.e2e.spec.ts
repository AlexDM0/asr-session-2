/**
 * Pins the preferences write against the real server on a scratch store: each preference alone and
 * several together, untouched other preferences, every refusal with its status and body,
 * persistence across a restart, and fail closed on a corrupted preferences row with nothing stored.
 */
import { Database } from 'bun:sqlite';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'bun:test';

import { type ScratchApiServer, startScratchApiServer } from './ScratchApiServer.setup';

const PREFERENCES_PATH = '/api/preferences';

const SEED_PREFERENCES = { paperMail: false, newsletter: true, claimUpdateTextMessages: true };

let scratchServer: ScratchApiServer;

beforeAll(async () => {
  scratchServer = await startScratchApiServer();
});

afterAll(async () => {
  await scratchServer.stop();
});

afterEach(async () => {
  await scratchServer.reset();
});

interface Answer {
  readonly status: number;
  readonly body:   unknown;
}

async function answerTo(init: RequestInit = {}): Promise<Answer> {
  const response = await fetch(`${scratchServer.origin}${PREFERENCES_PATH}`, init);
  return { status: response.status, body: await response.json() };
}

function jsonWrite(body: unknown, method = 'PATCH'): Promise<Answer> {
  return answerTo({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

async function storedPreferences(): Promise<unknown> {
  return (await answerTo()).body;
}

function validationFailure(fieldErrors: readonly { field: string; reason: string }[]): Answer {
  return { status: 422, body: { error: { code: 'validationFailed', message: 'The preferences are invalid.', fieldErrors } } };
}

describe('PATCH /api/preferences', () => {
  it('starts from the verbatim seed preferences', async () => {
    expect(await storedPreferences()).toStrictEqual(SEED_PREFERENCES);
  });

  it('stores each preference alone and answers all three stored values with the others untouched', async () => {
    expect(await jsonWrite({ paperMail: true })).toStrictEqual({ status: 200, body: { ...SEED_PREFERENCES, paperMail: true } });
    expect(await jsonWrite({ newsletter: false })).toStrictEqual({ status: 200, body: { ...SEED_PREFERENCES, paperMail: true, newsletter: false } });
    expect(await jsonWrite({ claimUpdateTextMessages: false })).toStrictEqual({ status: 200, body: { paperMail: true, newsletter: false, claimUpdateTextMessages: false } });
    expect(await storedPreferences()).toStrictEqual({ paperMail: true, newsletter: false, claimUpdateTextMessages: false });
  });

  it('stores several preferences at once', async () => {
    expect(await jsonWrite({ paperMail: true, claimUpdateTextMessages: false })).toStrictEqual({
      status: 200,
      body:   { paperMail: true, newsletter: true, claimUpdateTextMessages: false },
    });
  });

  it('refuses an empty object as required on preferences, a non-boolean as an invalid format and an unknown key, storing nothing', async () => {
    expect(await jsonWrite({})).toStrictEqual(validationFailure([{ field: 'preferences', reason: 'required' }]));
    expect(await jsonWrite({ newsletter: 'yes' })).toStrictEqual(validationFailure([{ field: 'newsletter', reason: 'invalidFormat' }]));
    expect(await jsonWrite({ paperMail: true, exampleKey: true })).toStrictEqual(validationFailure([{ field: 'exampleKey', reason: 'unknownField' }]));
    expect(await storedPreferences()).toStrictEqual(SEED_PREFERENCES);
  });

  it('answers 400 malformedRequest for a wrong content type, invalid JSON and a body that is not an object', async () => {
    const malformedRequestAnswer = { status: 400, body: { error: { code: 'malformedRequest' } } };
    expect(await answerTo({ method: 'PATCH', headers: { 'content-type': 'text/plain' }, body: '{"paperMail":true}' })).toMatchObject(malformedRequestAnswer);
    expect(await answerTo({ method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{' })).toMatchObject(malformedRequestAnswer);
    for (const nonObjectBody of [[{ paperMail: true }], 'text', 1, null]) {
      expect(await jsonWrite(nonObjectBody)).toMatchObject({ status: 400, body: { error: { code: 'malformedRequest' } } });
    }
  });

  it('keeps a saved preference across a server restart', async () => {
    await jsonWrite({ paperMail: true });

    await scratchServer.restart();

    expect(await storedPreferences()).toStrictEqual({ ...SEED_PREFERENCES, paperMail: true });
  });

  it('fails closed with 500 invalidStoredValue and stores nothing when the preferences row is corrupted', async () => {
    const connection = new Database(scratchServer.databasePath, { strict: true });
    connection.run('PRAGMA ignore_check_constraints = ON');
    connection.run('UPDATE preferences SET newsletter = 7');

    expect(await jsonWrite({ paperMail: true })).toMatchObject({ status: 500, body: { error: { code: 'invalidStoredValue' } } });

    expect(connection.query('SELECT paper_mail, newsletter FROM preferences').get()).toStrictEqual({ paper_mail: 0, newsletter: 7 });
    connection.close();
  });

  it('answers 405 operationNotOffered on PUT and POST', async () => {
    for (const method of ['PUT', 'POST']) {
      expect(await jsonWrite({ paperMail: true }, method)).toMatchObject({ status: 405, body: { error: { code: 'operationNotOffered' } } });
    }
  });
});
