/**
 * Covers the message writer through the ingestion. What matters: messages and their bodies come back
 * unchanged, ids are matched exactly, and a corrupted date or read flag fails closed with its path.
 */
import type { Database } from 'bun:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import type { Message }                                                                           from '../../../shared/model/Message';
import { SYNTHETIC_PROFILE, corruptStoredValue, openScratchStoreConnectionWithSyntheticCustomer } from '../scratchStoreConnection.setup';

import { MessageIngestion }    from './MessageIngestion';
import { createMessageWriter } from './MessageWriter';

const EXAMPLE_MESSAGE: Message = {
  id:     'EX-MESSAGE-1',
  title:  'Example message',
  sentOn: '2099-01-02',
  isRead: false,
  body:   'Example first paragraph.\n\nExample second paragraph.',
};

let connection: Database;

beforeEach(() => {
  connection = openScratchStoreConnectionWithSyntheticCustomer();
  createMessageWriter(connection).insertMessage(SYNTHETIC_PROFILE.customerNumber, EXAMPLE_MESSAGE);
});

afterEach(() => {
  connection.close();
});

describe('MessageIngestion', () => {
  it('reads back every message the writer stored, body included', () => {
    expect(new MessageIngestion(connection).readMessages()).toEqual({ outcome: 'found', value: [EXAMPLE_MESSAGE] });
  });

  it('reads one message by its exact id', () => {
    expect(new MessageIngestion(connection).readMessage('EX-MESSAGE-1')).toEqual({ outcome: 'found', value: EXAMPLE_MESSAGE });
  });

  it('answers absent for an unknown, empty or differently cased id', () => {
    const ingestion = new MessageIngestion(connection);

    expect(ingestion.readMessage('EX-MESSAGE-2')).toEqual({ outcome: 'absent' });
    expect(ingestion.readMessage('')).toEqual({ outcome: 'absent' });
    expect(ingestion.readMessage('ex-message-1')).toEqual({ outcome: 'absent' });
  });

  it('fails closed with the path of a malformed date', () => {
    corruptStoredValue(connection, 'UPDATE message SET sent_on = \'02-01-2099\'');

    expect(new MessageIngestion(connection).readMessage('EX-MESSAGE-1')).toEqual({ outcome: 'invalid', failedPaths: ['message[0].sent_on'] });
  });

  it('fails closed on a read flag that is neither 0 nor 1', () => {
    corruptStoredValue(connection, 'UPDATE message SET is_read = 5');

    expect(new MessageIngestion(connection).readMessages()).toEqual({ outcome: 'invalid', failedPaths: ['message[0].is_read'] });
  });
});
