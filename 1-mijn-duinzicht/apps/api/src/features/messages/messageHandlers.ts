import { ApiErrorResponse }    from '../../adapters/http/ApiErrorResponse';
import { MessageWireUtil }     from '../../adapters/http/MessageWireUtil';
import { foundValueOf }        from '../../adapters/store/IngestionVerdict';
import { MessageIngestion }    from '../../adapters/store/messages/MessageIngestion';
import { createMessageWriter } from '../../adapters/store/messages/MessageWriter';
import type { ApiContext }     from '../../services/ApiContext';

import { MessageOrderUtil } from './MessageOrderUtil';

export function createMessageHandlers(context: ApiContext) {
  return {
    readMessages(): Response {
      const messages = context.store.read((connection) => foundValueOf(new MessageIngestion(connection).readMessages(), 'messages')) ?? [];
      return Response.json(MessageWireUtil.messageListWireFor(MessageOrderUtil.inListOrder(messages)));
    },

    readMessage(messageId: string): Response {
      const message = context.store.read((connection) => foundValueOf(new MessageIngestion(connection).readMessage(messageId), 'message'));
      if (message === undefined) {
        return ApiErrorResponse.responseFor('notFound', `No message with id ${messageId}.`);
      }
      return Response.json(MessageWireUtil.messageDetailWireFor(message));
    },

    /** Ignores any request body; an absent or invalid message is refused before anything is written, and the answer is the stored state. */
    markMessageRead(messageId: string): Response {
      const markedMessage = context.store.write((connection) => {
        const ingestion = new MessageIngestion(connection);
        if (foundValueOf(ingestion.readMessage(messageId), 'message') === undefined) {
          return undefined;
        }
        createMessageWriter(connection).markMessageRead(messageId);
        return foundValueOf(ingestion.readMessage(messageId), 'message');
      });
      if (markedMessage === undefined) {
        return ApiErrorResponse.responseFor('notFound', `No message with id ${messageId}.`);
      }
      return Response.json(MessageWireUtil.messageDetailWireFor(markedMessage));
    },
  };
}
