/**
 * The writer's one update: marking a message read. What matters is that only the read flag of that
 * one message changes, that repeating it is harmless and that an unknown id changes nothing. Runs on
 * an in-memory scratch store with synthetic messages.
 */
import type { Database } from 'bun:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import type { Message }                                                       from '../../../shared/model/Message';
import { SYNTHETIC_PROFILE, openScratchStoreConnectionWithSyntheticCustomer } from '../scratchStoreConnection.setup';

import { MessageIngestion }    from './MessageIngestion';
import { createMessageWriter } from './MessageWriter';

const UNREAD_EXAMPLE_MESSAGE: Message = {
  id:     'EX-MESSAGE-1',
  title:  'Example unread message',
  sentOn: '2099-01-02',
  isRead: false,
  body:   'Example first paragraph.\n\nExample second paragraph.',
};

const OTHER_UNREAD_EXAMPLE_MESSAGE: Message = {
  id:     'EX-MESSAGE-2',
  title:  'Example other message',
  sentOn: '2099-01-03',
  isRead: false,
  body:   'Example other body.',
};

let connection: Database;

function storedMessages(): unknown {
  return new MessageIngestion(connection).readMessages();
}

beforeEach(() => {
  connection = openScratchStoreConnectionWithSyntheticCustomer();
  const writer = createMessageWriter(connection);
  writer.insertMessage(SYNTHETIC_PROFILE.customerNumber, UNREAD_EXAMPLE_MESSAGE);
  writer.insertMessage(SYNTHETIC_PROFILE.customerNumber, OTHER_UNREAD_EXAMPLE_MESSAGE);
});

afterEach(() => {
  connection.close();
});

describe('MessageWriter.markMessageRead', () => {
  it('sets is_read to 1 for the given message only', () => {
    createMessageWriter(connection).markMessageRead('EX-MESSAGE-1');

    expect(storedMessages()).toEqual({ outcome: 'found', value: [{ ...UNREAD_EXAMPLE_MESSAGE, isRead: true }, OTHER_UNREAD_EXAMPLE_MESSAGE] });
  });

  it('leaves title, sent date and body of that message unchanged', () => {
    createMessageWriter(connection).markMessageRead('EX-MESSAGE-1');

    expect(new MessageIngestion(connection).readMessage('EX-MESSAGE-1')).toEqual({ outcome: 'found', value: { ...UNREAD_EXAMPLE_MESSAGE, isRead: true } });
  });

  it('is harmless to repeat on a message that is already read', () => {
    const writer = createMessageWriter(connection);
    writer.markMessageRead('EX-MESSAGE-1');
    const storedAfterFirstWrite = storedMessages();

    writer.markMessageRead('EX-MESSAGE-1');

    expect(storedMessages()).toEqual(storedAfterFirstWrite);
  });

  it('changes no row for an id that matches no message', () => {
    const storedBefore = storedMessages();

    createMessageWriter(connection).markMessageRead('ex-message-1');

    expect(storedMessages()).toEqual(storedBefore);
  });
});
