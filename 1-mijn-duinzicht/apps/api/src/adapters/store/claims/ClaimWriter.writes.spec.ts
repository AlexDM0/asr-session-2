/**
 * The writes of the claim writer, run inside `store.write` on a scratch store file in a fresh
 * temporary directory. What matters: the stored result reads back through the ingestion exactly, the
 * photo rows carry every column, and a throw inside the work leaves the store unchanged.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir }      from 'node:os';
import { join }        from 'node:path';
import { Database }    from 'bun:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { type PortalStore, createPortalStore }       from '../../../services/store/PortalStore';
import type { Claim, ClaimPhoto }                    from '../../../shared/model/Claim';
import { createCustomerWriter }                      from '../customer/CustomerWriter';
import { STORE_MIGRATIONS, currentStructureVersion } from '../migrations/storeMigrations';
import { createPolicyWriter }                        from '../policies/PolicyWriter';
import { SYNTHETIC_PROFILE }                         from '../scratchStoreConnection.setup';

import { ClaimIngestion }    from './ClaimIngestion';
import { createClaimWriter } from './ClaimWriter';

const WAITING_CLAIM: Claim = {
  id:            'S-2099-0001',
  title:         'Example waiting claim',
  category:      'home',
  policyId:      'EX-POLICY-1',
  reportedAt:    '2099-01-02T03:04',
  status:        'inProgress',
  handlerName:   'Example Handler',
  incidentDate:  '2099-01-01',
  description:   'Example description',
  photoDeadline: '2099-01-10',
  steps:         [
    {
      title: 'Example step 1', description: 'Example done', state: 'done', waitsForPhotos: false,
    },
    {
      title: 'Example step 2', description: 'Example waiting', state: 'current', waitsForPhotos: true,
    },
    {
      title: 'Example step 3', description: 'Example to do', state: 'todo', waitsForPhotos: false,
    },
  ],
};

const CLAIM_AFTER_RECEIPT: Claim = {
  ...WAITING_CLAIM,
  photoDeadline: null,
  steps:         [
    {
      title: 'Example step 1', description: 'Example done', state: 'done', waitsForPhotos: false,
    },
    {
      title: 'Example step 2', description: '2 foto\'s ontvangen', state: 'done', waitsForPhotos: false,
    },
    {
      title: 'Example step 3', description: 'Example to do', state: 'current', waitsForPhotos: false,
    },
  ],
};

const EXAMPLE_PHOTOS: readonly ClaimPhoto[] = [
  {
    photoId:          'example-photo-1',
    claimId:          'S-2099-0001',
    originalFileName: 'Example.JPG',
    mediaType:        'image/jpeg',
    sizeBytes:        1,
    storedFileName:   'example-photo-1.jpg',
    uploadedAt:       '2099-01-03T04:05:06',
  },
  {
    photoId:          'example-photo-2',
    claimId:          'S-2099-0001',
    originalFileName: '',
    mediaType:        'image/png',
    sizeBytes:        10_485_760,
    storedFileName:   'example-photo-2.png',
    uploadedAt:       '2099-01-03T04:05:06',
  },
];

let temporaryRoot: string;
let store: PortalStore;

function createScratchStoreFile(databasePath: string): void {
  const connection = new Database(databasePath, { create: true, strict: true });
  connection.run('PRAGMA foreign_keys = ON');
  for (const migration of STORE_MIGRATIONS) {
    for (const statement of migration.statements) {
      connection.run(statement);
    }
  }
  connection.run(`PRAGMA user_version = ${currentStructureVersion()}`);
  createCustomerWriter(connection).insertProfile(SYNTHETIC_PROFILE);
  createPolicyWriter(connection).insertPolicy(SYNTHETIC_PROFILE.customerNumber, {
    id: 'EX-POLICY-1', kind: 'home', name: 'Example policy', subtitle: 'Example subtitle', monthlyPremiumCents: 100, status: 'active', facts: [], coverage: [],
  }, 1);
  createClaimWriter(connection).insertClaim(SYNTHETIC_PROFILE.customerNumber, WAITING_CLAIM);
  connection.close();
}

function storedClaim(claimId: string): unknown {
  return store.read((connection) => new ClaimIngestion(connection).readClaim(claimId));
}

function storedPhotoRows(): unknown[] {
  return store.read((connection) => connection.query<unknown, []>('SELECT * FROM claim_photo ORDER BY photo_id').all());
}

beforeEach(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), 'claim-writer-writes-'));
  const databasePath = join(temporaryRoot, 'portal.sqlite');
  createScratchStoreFile(databasePath);
  store = createPortalStore(databasePath);
});

afterEach(async () => {
  await rm(temporaryRoot, { recursive: true, force: true });
});

describe('ClaimWriter.recordPhotoReceipt', () => {
  it('stores the changed steps, the cleared deadline and one row per photo', () => {
    store.write((connection) => createClaimWriter(connection).recordPhotoReceipt(CLAIM_AFTER_RECEIPT, EXAMPLE_PHOTOS));

    expect(storedClaim('S-2099-0001')).toStrictEqual({ outcome: 'found', value: CLAIM_AFTER_RECEIPT });
    expect(storedPhotoRows()).toStrictEqual([
      {
        photo_id:           'example-photo-1',
        claim_id:           'S-2099-0001',
        original_file_name: 'Example.JPG',
        media_type:         'image/jpeg',
        size_bytes:         1,
        stored_file_name:   'example-photo-1.jpg',
        uploaded_at:        '2099-01-03T04:05:06',
      },
      {
        photo_id:           'example-photo-2',
        claim_id:           'S-2099-0001',
        original_file_name: '',
        media_type:         'image/png',
        size_bytes:         10_485_760,
        stored_file_name:   'example-photo-2.png',
        uploaded_at:        '2099-01-03T04:05:06',
      },
    ]);
  });

  it('leaves the store unchanged when the work throws after the receipt', () => {
    expect(() => store.write((connection) => {
      createClaimWriter(connection).recordPhotoReceipt(CLAIM_AFTER_RECEIPT, EXAMPLE_PHOTOS);
      throw new Error('Example failure');
    })).toThrow('Example failure');

    expect(storedClaim('S-2099-0001')).toStrictEqual({ outcome: 'found', value: WAITING_CLAIM });
    expect(storedPhotoRows()).toStrictEqual([]);
  });
});

const REPORTED_CLAIM: Claim = {
  id:            'S-2099-0002',
  title:         'Example reported claim',
  category:      'car',
  policyId:      'EX-POLICY-1',
  reportedAt:    '2099-02-03T04:05',
  status:        'reported',
  handlerName:   null,
  incidentDate:  '2099-02-01',
  description:   'Example line one\nExample line two',
  photoDeadline: null,
  steps:         [
    {
      title: 'Example step 1', description: 'Example reported', state: 'done', waitsForPhotos: false,
    },
    {
      title: 'Example step 2', description: 'Example received', state: 'current', waitsForPhotos: false,
    },
    {
      title: 'Example step 3', description: 'Example information', state: 'todo', waitsForPhotos: false,
    },
    {
      title: 'Example step 4', description: 'Example assessment', state: 'todo', waitsForPhotos: false,
    },
  ],
};

describe('ClaimWriter.insertReportedClaim', () => {
  it('stores the claim for the store\'s one customer with its four steps', () => {
    store.write((connection) => createClaimWriter(connection).insertReportedClaim(REPORTED_CLAIM));

    expect(storedClaim('S-2099-0002')).toStrictEqual({ outcome: 'found', value: REPORTED_CLAIM });
    expect(store.read((connection) => connection.query<unknown, []>('SELECT customer_number FROM claim WHERE claim_id = \'S-2099-0002\'').get()))
      .toStrictEqual({ customer_number: SYNTHETIC_PROFILE.customerNumber });
  });

  it('rolls back the claim and its steps when the work throws', () => {
    expect(() => store.write((connection) => {
      createClaimWriter(connection).insertReportedClaim(REPORTED_CLAIM);
      throw new Error('Example failure');
    })).toThrow('Example failure');

    expect(storedClaim('S-2099-0002')).toStrictEqual({ outcome: 'absent' });
    expect(store.read((connection) => connection.query<unknown, []>('SELECT * FROM claim_step WHERE claim_id = \'S-2099-0002\'').all())).toStrictEqual([]);
  });
});
