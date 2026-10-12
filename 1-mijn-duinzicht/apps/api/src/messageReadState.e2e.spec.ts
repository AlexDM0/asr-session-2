/**
 * Pins PUT /api/messages/:messageId/read against the real server on a scratch store built from the
 * bundled seed, so the seed's messages are asserted verbatim here. What matters: the unread message
 * becomes read and stays read across a restart, the call is idempotent, nothing else changes, any
 * body is ignored, unknown ids and corrupted rows are refused without a write, and other methods 405.
 */
import { Database } from 'bun:sqlite';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { type ScratchApiServer, startScratchApiServer } from './ScratchApiServer.setup';

const READ_PATH = '/api/messages/M-2026-0103/read';

const SEED_MESSAGE_BODIES = {
  'M-2026-0103': 'Hoi Sanne,\n\nWe hebben je schademelding S-2026-0418 (Waterschade badkamer) op 6 oktober 2026 ontvangen. Joost Meijer behandelt je melding.\n\n'
    + 'Wil je foto\'s van de schade uploaden? Dan kunnen we je melding afronden. Upload ze uiterlijk 15 oktober 2026 bij Schade.\n\nGroet,\nDuinzicht Verzekeringen',
  'M-2026-0087': 'Hoi Sanne,\n\nEr staat een nieuw polisblad klaar voor je autoverzekering (DZ-AU-902117). Je dekking en je premie van € 41,60 per maand blijven gelijk. '
    + 'Je vindt het polisblad bij Polissen.\n\nGroet,\nDuinzicht Verzekeringen',
  'M-2026-0021': 'Hoi Sanne,\n\nJe jaaroverzicht 2025 staat klaar. Je ziet daarin welke premies je in 2025 hebt betaald. Bewaar het overzicht goed, '
    + 'bijvoorbeeld voor je administratie.\n\nGroet,\nDuinzicht Verzekeringen',
};

const SEED_MESSAGES = [
  {
    id: 'M-2026-0103', title: 'Ontvangstbevestiging schademelding', sentOn: '2026-10-06', isRead: false,
  },
  {
    id: 'M-2026-0087', title: 'Nieuw polisblad autoverzekering', sentOn: '2026-09-01', isRead: true,
  },
  {
    id: 'M-2026-0021', title: 'Jaaroverzicht 2025', sentOn: '2026-02-12', isRead: true,
  },
];

const MARKED_SEED_MESSAGES = SEED_MESSAGES.map((message) => ({ ...message, isRead: true }));

const MARKED_DETAIL = { ...MARKED_SEED_MESSAGES[0], body: SEED_MESSAGE_BODIES['M-2026-0103'] };

let scratchServer: ScratchApiServer;

beforeAll(async () => {
  scratchServer = await startScratchApiServer();
});

beforeEach(async () => {
  await scratchServer.reset();
});

afterAll(async () => {
  await scratchServer.stop();
});

async function answerTo(path: string, init: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${scratchServer.origin}${path}`, init);
  return { status: response.status, body: await response.json() };
}

async function storedMessageState(): Promise<unknown[]> {
  const answers = [await answerTo('/api/messages')];
  for (const message of SEED_MESSAGES) {
    answers.push(await answerTo(`/api/messages/${message.id}`));
  }
  return answers;
}

function storedReadFlagOf(messageId: string): unknown {
  const connection = new Database(scratchServer.databasePath, { strict: true });
  const row = connection.query<{ is_read: unknown }, [string]>('SELECT is_read FROM message WHERE message_id = ?').get(messageId);
  connection.close();
  return row?.is_read;
}

describe('PUT /api/messages/:messageId/read', () => {
  it('marks the unread seed message M-2026-0103 read and answers its stored detail with isRead true', async () => {
    expect(await answerTo(READ_PATH, { method: 'PUT' })).toEqual({ status: 200, body: MARKED_DETAIL });
  });

  it('keeps the message read after the server restarts', async () => {
    await answerTo(READ_PATH, { method: 'PUT' });

    await scratchServer.restart();

    expect(await answerTo('/api/messages/M-2026-0103')).toEqual({ status: 200, body: MARKED_DETAIL });
    expect(await answerTo('/api/messages')).toEqual({ status: 200, body: { messages: MARKED_SEED_MESSAGES } });
  });

  it('answers a repeated call identically and changes nothing else', async () => {
    const firstAnswer = await answerTo(READ_PATH, { method: 'PUT' });
    const stateAfterFirstCall = await storedMessageState();

    const secondAnswer = await answerTo(READ_PATH, { method: 'PUT' });

    expect(secondAnswer).toEqual(firstAnswer);
    expect(await storedMessageState()).toEqual(stateAfterFirstCall);
  });

  it('changes no other message and no other field of that message', async () => {
    const stateBefore = await storedMessageState();

    expect(stateBefore[0]).toEqual({ status: 200, body: { messages: SEED_MESSAGES } });
    await answerTo(READ_PATH, { method: 'PUT' });

    expect(await storedMessageState()).toEqual([
      { status: 200, body: { messages: MARKED_SEED_MESSAGES } },
      ...SEED_MESSAGES.map((message) => ({
        status: 200,
        body:   { ...message, isRead: true, body: SEED_MESSAGE_BODIES[message.id as keyof typeof SEED_MESSAGE_BODIES] },
      })),
    ]);
  });

  it('ignores a request body and its content type and never answers 400', async () => {
    const bodies: RequestInit[] = [
      { method: 'PUT', body: '{not json', headers: { 'content-type': 'application/json' } },
      { method: 'PUT', body: '["example"]', headers: { 'content-type': 'application/json' } },
      { method: 'PUT', body: 'example text', headers: { 'content-type': 'text/plain' } },
    ];
    for (const init of bodies) {
      expect(await answerTo(READ_PATH, init)).toEqual({ status: 200, body: MARKED_DETAIL });
    }
  });

  it('refuses an unknown id with 404 notFound and writes nothing', async () => {
    const stateBefore = await storedMessageState();

    for (const path of ['/api/messages/M-0000-0000/read', '/api/messages/m-2026-0103/read']) {
      const { status, body } = await answerTo(path, { method: 'PUT' });

      expect(status).toBe(404);
      expect(body).toMatchObject({ error: { code: 'notFound' } });
    }
    expect(await storedMessageState()).toEqual(stateBefore);
  });

  it('answers 405 operationNotOffered for GET, POST, PATCH and DELETE on the read path', async () => {
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      const { status, body } = await answerTo(READ_PATH, { method });

      expect(status).toBe(405);
      expect(body).toMatchObject({ error: { code: 'operationNotOffered' } });
    }
    expect(storedReadFlagOf('M-2026-0103')).toBe(0);
  });

  it('refuses a message whose stored row fails ingestion with 500 invalidStoredValue and writes nothing', async () => {
    const connection = new Database(scratchServer.databasePath, { strict: true });
    connection.run('PRAGMA ignore_check_constraints = ON');
    connection.run('UPDATE message SET sent_on = \'2026-02-30\' WHERE message_id = \'M-2026-0103\'');
    connection.close();

    const { status, body } = await answerTo(READ_PATH, { method: 'PUT' });

    expect(status).toBe(500);
    expect(body).toMatchObject({ error: { code: 'invalidStoredValue' } });
    expect(storedReadFlagOf('M-2026-0103')).toBe(0);
  });
});
