import { RecordReader }  from '@mijn-duinzicht/record-reader/RecordReader';
import type { Database } from 'bun:sqlite';


import type { Message }                               from '../../../shared/model/Message';
import { type IngestionVerdict, ingestionVerdictFor } from '../IngestionVerdict';

type StatementBindings = Record<string, string | number | null>;

/** Reads messages with their bodies; ordering is the messages feature's concern. */
export class MessageIngestion {
  readonly #connection: Database;

  constructor(connection: Database) {
    this.#connection = connection;
  }

  readMessages(): IngestionVerdict<readonly Message[]> {
    return MessageIngestion.#messagesFrom(this.#connection.query<unknown, []>('SELECT * FROM message ORDER BY message_id').all());
  }

  /** Ids are matched exactly: a differently cased or empty id is `absent`. */
  readMessage(messageId: string): IngestionVerdict<Message> {
    const rows = this.#connection.query<unknown, StatementBindings>('SELECT * FROM message WHERE message_id = $messageId').all({ messageId });
    const verdict = MessageIngestion.#messagesFrom(rows);
    if (verdict.outcome !== 'found') {
      return verdict;
    }
    const [message] = verdict.value;
    return message === undefined ? { outcome: 'absent' } : { outcome: 'found', value: message };
  }

  static #messagesFrom(rows: readonly unknown[]): IngestionVerdict<readonly Message[]> {
    const reader = new RecordReader({ message: rows });
    const messages = reader.array('message', (messagesReader, index) => messagesReader.record(index, (messageReader): Message => ({
      id:     messageReader.nonEmptyString('message_id'),
      title:  messageReader.nonEmptyString('title'),
      sentOn: messageReader.calendarDate('sent_on'),
      isRead: messageReader.integer('is_read', { minimum: 0, maximum: 1 }) === 1,
      body:   messageReader.string('body'),
    })));
    return ingestionVerdictFor(reader.verdictFor<readonly Message[]>(messages));
  }
}
