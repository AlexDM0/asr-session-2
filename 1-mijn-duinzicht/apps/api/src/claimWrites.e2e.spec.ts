/**
 * Pins both claim write endpoints against the real server on a scratch store seeded from the bundled
 * seed, so seed values are asserted verbatim here only. What matters: every answer of each endpoint in
 * its refusal order, the stored result read back through the read endpoints, and all-or-nothing:
 * after every refusal the store and the upload directory are unchanged. Photo bytes are built here.
 */
import {
  mkdir,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { DutchFormat } from '@mijn-duinzicht/dutch-format/DutchFormat';
import { Database }    from 'bun:sqlite';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';


import { type ScratchApiServer, startScratchApiServer } from './ScratchApiServer.setup';
import { AmsterdamClockUtil }                           from './features/claims/AmsterdamClockUtil';

const WAITING_CLAIM_ID = 'S-2026-0418';
const PHOTO_SIZE_LIMIT_BYTES = 10_485_760;
const JPEG_HEADER = [0xFF, 0xD8, 0xFF, 0xE0];

let scratchServer: ScratchApiServer;

beforeAll(async () => {
  scratchServer = await startScratchApiServer();
});

afterAll(async () => {
  await scratchServer.stop();
});

interface Answer {
  readonly status:  number;
  readonly body:    unknown;
  readonly headers: Headers;
}

async function answerTo(path: string, init: RequestInit = {}): Promise<Answer> {
  const response = await fetch(`${scratchServer.origin}${path}`, init);
  return { status: response.status, body: await response.json(), headers: response.headers };
}

function jpegPhoto(fileName: string, sizeBytes = JPEG_HEADER.length): File {
  const content = new Uint8Array(sizeBytes);
  content.set(JPEG_HEADER);
  return new File([content], fileName, { type: 'image/jpeg' });
}

function photoUploadBody(parts: readonly (readonly [string, string | File])[]): FormData {
  const formData = new FormData();
  for (const [partName, partValue] of parts) {
    formData.append(partName, partValue);
  }
  return formData;
}

function uploadPhotos(claimId: string, body: FormData | string, headers: Record<string, string> = {}): Promise<Answer> {
  return answerTo(`/api/claims/${claimId}/photos`, { method: 'POST', body, headers });
}

function errorCodeOf(answer: Answer): unknown {
  return (answer.body as { error?: { code?: unknown } }).error?.code;
}

function changeScratchStore(statement: string): void {
  const connection = new Database(scratchServer.databasePath, { strict: true });
  connection.run(statement);
  connection.close();
}

function storedRows(): unknown {
  const connection = new Database(scratchServer.databasePath, { readonly: true, strict: true });
  try {
    return {
      claim:      connection.query('SELECT * FROM claim ORDER BY claim_id').all(),
      claimStep:  connection.query('SELECT * FROM claim_step ORDER BY claim_id, position').all(),
      claimPhoto: connection.query('SELECT * FROM claim_photo ORDER BY photo_id').all(),
    };
  } finally {
    connection.close();
  }
}

async function uploadDirectoryFiles(): Promise<string[]> {
  try {
    return (await readdir(scratchServer.uploadDirectory)).toSorted();
  } catch {
    return [];
  }
}

describe('POST /api/claims/:claimId/photos refusals', () => {
  let rowsBefore: unknown;
  let filesBefore: string[];

  beforeAll(async () => {
    await scratchServer.reset();
    rowsBefore = storedRows();
    filesBefore = await uploadDirectoryFiles();
  });

  async function expectNothingStored(): Promise<void> {
    expect(storedRows()).toStrictEqual(rowsBefore);
    expect(await uploadDirectoryFiles()).toStrictEqual(filesBefore);
  }

  it('answers 404 notFound for an unknown claim', async () => {
    const answer = await uploadPhotos('S-0000-0000', photoUploadBody([['photos', jpegPhoto('a.jpg')]]));

    expect([answer.status, errorCodeOf(answer)]).toStrictEqual([404, 'notFound']);
    await expectNothingStored();
  });

  it('answers 400 malformedRequest for a JSON body, a text part and a file part named otherwise', async () => {
    const answers = [
      await uploadPhotos(WAITING_CLAIM_ID, JSON.stringify({ photos: [] }), { 'content-type': 'application/json' }),
      await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([['photos', jpegPhoto('a.jpg')], ['photos', 'text']])),
      await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([['photo', jpegPhoto('a.jpg')]])),
    ];

    expect(answers.map((answer) => [answer.status, errorCodeOf(answer)])).toStrictEqual(Array.from({ length: 3 }, () => [400, 'malformedRequest']));
    await expectNothingStored();
  });

  it('answers 409 photosNotExpected for a claim that does not wait for photos', async () => {
    const answer = await uploadPhotos('S-2025-0127', photoUploadBody([['photos', jpegPhoto('a.jpg')]]));

    expect([answer.status, errorCodeOf(answer)]).toStrictEqual([409, 'photosNotExpected']);
    await expectNothingStored();
  });

  it('answers 422 photoCountOutOfRange for zero and eleven photos', async () => {
    const elevenPhotos = Array.from({ length: 11 }, (_, index) => ['photos', jpegPhoto(`photo-${index}.jpg`)] as const);
    const answers = [
      await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([])),
      await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody(elevenPhotos)),
    ];

    expect(answers.map((answer) => [answer.status, errorCodeOf(answer)])).toStrictEqual([[422, 'photoCountOutOfRange'], [422, 'photoCountOutOfRange']]);
    await expectNothingStored();
  });

  it('answers 415 unsupportedPhotoType for text named .jpg and for an empty file', async () => {
    const answers = [
      await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([['photos', new File(['Example text'], 'example.jpg', { type: 'image/jpeg' })]])),
      await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([['photos', new File([], 'empty.jpg', { type: 'image/jpeg' })]])),
    ];

    expect(answers.map((answer) => [answer.status, errorCodeOf(answer)])).toStrictEqual([[415, 'unsupportedPhotoType'], [415, 'unsupportedPhotoType']]);
    await expectNothingStored();
  });

  it('answers 413 photoTooLarge for a photo one byte above 10 MiB', async () => {
    const answer = await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([['photos', jpegPhoto('large.jpg', PHOTO_SIZE_LIMIT_BYTES + 1)]]));

    expect([answer.status, errorCodeOf(answer)]).toStrictEqual([413, 'photoTooLarge']);
    await expectNothingStored();
  });

  it('answers 500 internalError with the store unchanged and no file left when the upload directory cannot be written', async () => {
    await rm(scratchServer.uploadDirectory, { recursive: true, force: true });
    await writeFile(scratchServer.uploadDirectory, 'not a directory');
    try {
      const answer = await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([['photos', jpegPhoto('a.jpg')], ['photos', jpegPhoto('b.jpg')]]));

      expect([answer.status, errorCodeOf(answer)]).toStrictEqual([500, 'internalError']);
      expect(storedRows()).toStrictEqual(rowsBefore);
    } finally {
      await rm(scratchServer.uploadDirectory, { force: true });
      await mkdir(scratchServer.uploadDirectory, { recursive: true });
    }
    expect(await uploadDirectoryFiles()).toStrictEqual([]);
  });
});

describe('POST /api/claims/:claimId/photos success', () => {
  beforeEach(async () => {
    await scratchServer.reset();
  });

  it('stores two photos, advances the timeline and clears the photo action', async () => {
    const answer = await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([['photos', jpegPhoto('a.jpg')], ['photos', jpegPhoto('b.jpg')]]));

    const expectedDetail = {
      id:                   'S-2026-0418',
      title:                'Waterschade badkamer',
      category:             'home',
      policyId:             'DZ-WH-118204',
      policyName:           'Woonhuisverzekering',
      reportedAt:           '2026-10-06T09:14',
      status:               'inProgress',
      handlerName:          'Joost Meijer',
      awaitsCustomerPhotos: false,
      incidentDate:         null,
      description:          null,
      photoDeadline:        null,
      steps:                [
        {
          title: 'Schade gemeld', description: '6 oktober 2026, 09:14', state: 'done', waitsForPhotos: false,
        },
        {
          title: 'Melding ontvangen', description: 'Behandelaar: Joost Meijer', state: 'done', waitsForPhotos: false,
        },
        {
          title: 'Aanvullende informatie', description: '2 foto\'s ontvangen', state: 'done', waitsForPhotos: false,
        },
        {
          title: 'Beoordeling en uitbetaling', description: 'Binnen 5 werkdagen na ontvangst', state: 'current', waitsForPhotos: false,
        },
      ],
    };
    expect(answer.status).toBe(200);
    expect(answer.body).toStrictEqual(expectedDetail);
    expect((await answerTo(`/api/claims/${WAITING_CLAIM_ID}`)).body).toStrictEqual(expectedDetail);
    const listBody = (await answerTo('/api/claims')).body as { claims: { id: string; stepStates: unknown; awaitsCustomerPhotos: unknown }[] };
    const listedClaim = listBody.claims.find((claim) => claim.id === WAITING_CLAIM_ID);
    expect([listedClaim?.stepStates, listedClaim?.awaitsCustomerPhotos]).toStrictEqual([['done', 'done', 'done', 'current'], false]);
    expect((await answerTo('/api/open-actions')).body).toStrictEqual({ openActions: [{ kind: 'confirmEmailAddress', lastConfirmedYear: 2023 }] });
    expect(await uploadDirectoryFiles()).toHaveLength(2);
  });

  it('answers 409 photosNotExpected to a second upload and stores nothing more', async () => {
    await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([['photos', jpegPhoto('a.jpg')]]));
    const rowsAfterFirst = storedRows();

    const answer = await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([['photos', jpegPhoto('b.jpg')]]));

    expect([answer.status, errorCodeOf(answer)]).toStrictEqual([409, 'photosNotExpected']);
    expect(storedRows()).toStrictEqual(rowsAfterFirst);
    expect(await uploadDirectoryFiles()).toHaveLength(1);
  });

  it('describes a single photo as "1 foto ontvangen"', async () => {
    const answer = await uploadPhotos(WAITING_CLAIM_ID, photoUploadBody([['photos', jpegPhoto('a.jpg')]]));

    expect((answer.body as { steps: { description: string }[] }).steps[2]?.description).toBe('1 foto ontvangen');
  });
});

const TODAY = AmsterdamClockUtil.localDateAt(new Date());
const CURRENT_YEAR = TODAY.slice(0, 4);
const EXPECTED_NEW_CLAIM_ID = CURRENT_YEAR === '2026' ? 'S-2026-0419' : `S-${CURRENT_YEAR}-0001`;

function dayAfter(isoDate: string): string {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

const VALID_REPORT = {
  category: 'car', policyId: 'DZ-AU-902117', incidentDate: '2026-10-01', description: 'Synthetic example description.',
};

function reportClaim(body: unknown, contentType = 'application/json'): Promise<Answer> {
  return answerTo('/api/claims', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': contentType } });
}

function fieldErrorsOf(answer: Answer): unknown {
  return (answer.body as { error?: { fieldErrors?: unknown } }).error?.fieldErrors;
}

describe('POST /api/claims refusals', () => {
  let rowsBefore: unknown;

  beforeAll(async () => {
    await scratchServer.reset();
    rowsBefore = storedRows();
  });

  it('answers 400 malformedRequest for text/plain, invalid JSON and an array', async () => {
    const answers = [
      await reportClaim(VALID_REPORT, 'text/plain'),
      await reportClaim('{"category": ', 'application/json'),
      await reportClaim([VALID_REPORT]),
    ];

    expect(answers.map((answer) => [answer.status, errorCodeOf(answer)])).toStrictEqual(Array.from({ length: 3 }, () => [400, 'malformedRequest']));
    expect(storedRows()).toStrictEqual(rowsBefore);
  });

  it.each([
    ['an absent category', { category: undefined }, [{ field: 'category', reason: 'required' }]],
    ['an unknown category', { category: 'boat' }, [{ field: 'category', reason: 'invalidFormat' }]],
    ['an empty policy id', { policyId: '' }, [{ field: 'policyId', reason: 'required' }]],
    ['an unknown policy', { policyId: 'DZ-XX-000000' }, [{ field: 'policyId', reason: 'notEligible' }]],
    ['a policy of the wrong kind', { policyId: 'DZ-WH-118204' }, [{ field: 'policyId', reason: 'notEligible' }]],
    ['an absent incident date', { incidentDate: undefined }, [{ field: 'incidentDate', reason: 'required' }]],
    ['an impossible incident date', { incidentDate: '2026-02-31' }, [{ field: 'incidentDate', reason: 'invalidFormat' }]],
    ['tomorrow as incident date', { incidentDate: dayAfter(TODAY) }, [{ field: 'incidentDate', reason: 'inFuture' }]],
    ['a null description', { description: null }, [{ field: 'description', reason: 'required' }]],
    ['a numeric description', { description: 42 }, [{ field: 'description', reason: 'invalidFormat' }]],
    ['a description of nine code points', { description: ' Too short ' }, [{ field: 'description', reason: 'tooShort' }]],
    ['a description of 2001 code points', { description: 'x'.repeat(2001) }, [{ field: 'description', reason: 'tooLong' }]],
    ['an unknown key', { status: 'paidOut' }, [{ field: 'status', reason: 'unknownField' }]],
    ['several faults at once', { category: 'boat', incidentDate: dayAfter(TODAY), description: '' }, [
      { field: 'category', reason: 'invalidFormat' },
      { field: 'incidentDate', reason: 'inFuture' },
      { field: 'description', reason: 'required' },
    ]],
  ])('answers 422 validationFailed for %s', async (_case, overrides, expectedFieldErrors) => {
    const answer = await reportClaim({ ...VALID_REPORT, ...overrides });

    expect([answer.status, errorCodeOf(answer), fieldErrorsOf(answer)]).toStrictEqual([422, 'validationFailed', expectedFieldErrors]);
    expect(storedRows()).toStrictEqual(rowsBefore);
  });

  it('answers 422 notEligible for an ended policy', async () => {
    changeScratchStore('UPDATE policy SET status = \'ended\' WHERE policy_id = \'DZ-AU-902117\'');
    try {
      const answer = await reportClaim(VALID_REPORT);

      expect([answer.status, fieldErrorsOf(answer)]).toStrictEqual([422, [{ field: 'policyId', reason: 'notEligible' }]]);
    } finally {
      changeScratchStore('UPDATE policy SET status = \'active\' WHERE policy_id = \'DZ-AU-902117\'');
    }
    expect(storedRows()).toStrictEqual(rowsBefore);
  });

  it('answers 409 claimSequenceExhausted when the report year already holds 9999', async () => {
    changeScratchStore(`INSERT INTO claim (claim_id, customer_number, policy_id, title, category, reported_at, status)
      VALUES ('S-${CURRENT_YEAR}-9999', '40218773', 'DZ-AU-902117', 'Example claim', 'car', '${TODAY}T00:00', 'reported')`);
    const rowsWithFullYear = storedRows();
    try {
      const answer = await reportClaim(VALID_REPORT);

      expect([answer.status, errorCodeOf(answer)]).toStrictEqual([409, 'claimSequenceExhausted']);
      expect(storedRows()).toStrictEqual(rowsWithFullYear);
    } finally {
      await scratchServer.reset();
    }
  });
});

describe('POST /api/claims success', () => {
  beforeEach(async () => {
    await scratchServer.reset();
  });

  it('answers 201 with the new claim, its four steps and its Location', async () => {
    const answer = await reportClaim(VALID_REPORT);
    const body = answer.body as { reportedAt: string };

    expect(answer.status).toBe(201);
    expect(answer.headers.get('location')).toBe(`/api/claims/${EXPECTED_NEW_CLAIM_ID}`);
    expect(body.reportedAt).toMatch(new RegExp(`^${TODAY}T\\d{2}:\\d{2}$`));
    expect(answer.body).toStrictEqual({
      id:                   EXPECTED_NEW_CLAIM_ID,
      title:                'Schade met auto',
      category:             'car',
      policyId:             'DZ-AU-902117',
      policyName:           'Autoverzekering',
      reportedAt:           body.reportedAt,
      status:               'reported',
      handlerName:          null,
      awaitsCustomerPhotos: false,
      incidentDate:         '2026-10-01',
      description:          'Synthetic example description.',
      photoDeadline:        null,
      steps:                [
        {
          title: 'Schade gemeld', description: DutchFormat.dateAndTime(body.reportedAt), state: 'done', waitsForPhotos: false,
        },
        {
          title: 'Melding ontvangen', description: 'We wijzen je melding toe aan een behandelaar', state: 'current', waitsForPhotos: false,
        },
        {
          title: 'Aanvullende informatie', description: 'Als we meer van je nodig hebben, hoor je het van ons', state: 'todo', waitsForPhotos: false,
        },
        {
          title: 'Beoordeling en uitbetaling', description: 'Binnen 5 werkdagen na ontvangst', state: 'todo', waitsForPhotos: false,
        },
      ],
    });
    expect((await answerTo(`/api/claims/${EXPECTED_NEW_CLAIM_ID}`)).body).toStrictEqual(answer.body);
  });

  it('lists the new claim first and adds no open action', async () => {
    await reportClaim(VALID_REPORT);

    const listBody = (await answerTo('/api/claims')).body as { claims: { id: string }[] };
    expect(listBody.claims[0]?.id).toBe(EXPECTED_NEW_CLAIM_ID);
    expect((await answerTo('/api/open-actions')).body).toStrictEqual({
      openActions: [
        {
          kind: 'uploadClaimPhotos', claimId: 'S-2026-0418', claimTitle: 'Waterschade badkamer', deadline: '2026-10-15',
        },
        { kind: 'confirmEmailAddress', lastConfirmedYear: 2023 },
      ],
    });
  });

  it('accepts a description of exactly 2000 code points including emoji', async () => {
    const description = `${'😀'.repeat(1000)}${'x'.repeat(1000)}`;

    const answer = await reportClaim({ ...VALID_REPORT, description });

    expect([answer.status, (answer.body as { description: string }).description]).toStrictEqual([201, description]);
  });

  it('gives two simultaneous reports two different ids', async () => {
    const answers = await Promise.all([reportClaim(VALID_REPORT), reportClaim(VALID_REPORT)]);

    const ids = answers.map((answer) => (answer.body as { id: string }).id);
    expect(answers.map((answer) => answer.status)).toStrictEqual([201, 201]);
    expect(new Set(ids).size).toBe(2);
  });
});
