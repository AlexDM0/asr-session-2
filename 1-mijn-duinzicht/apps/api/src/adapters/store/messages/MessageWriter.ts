import type { Database } from 'bun:sqlite';

import type { Message } from '../../../shared/model/Message';

type StatementBindings = Record<string, string | number | null>;

export interface MessageWriter {
  insertMessage(customerNumber: string, message: Message): void;
  /** Sets only the read flag of the message with exactly this id; an unknown id changes no row. */
  markMessageRead(messageId: string): void;
}

export function createMessageWriter(connection: Database): MessageWriter {
  return {
    insertMessage(customerNumber, message) {
      connection.query<never, StatementBindings>(
        `INSERT INTO message (message_id, customer_number, title, sent_on, is_read, body)
         VALUES ($messageId, $customerNumber, $title, $sentOn, $isRead, $body)`,
      ).run({
        messageId: message.id,
        customerNumber,
        title:     message.title,
        sentOn:    message.sentOn,
        isRead:    message.isRead ? 1 : 0,
        body:      message.body,
      });
    },

    markMessageRead(messageId) {
      connection.query<never, StatementBindings>('UPDATE message SET is_read = 1 WHERE message_id = $messageId').run({ messageId });
    },
  };
}
