import type { MessageDetailWire, MessageListWire, MessageSummaryWire } from '@mijn-duinzicht/api-contract/MessageWire';

import type { Message } from '../../shared/model/Message';

export const MessageWireUtil = {
  messageSummaryWireFor(message: Message): MessageSummaryWire {
    return {
      id:     message.id,
      title:  message.title,
      sentOn: message.sentOn,
      isRead: message.isRead,
    };
  },

  messageDetailWireFor(message: Message): MessageDetailWire {
    return { ...MessageWireUtil.messageSummaryWireFor(message), body: message.body };
  },

  messageListWireFor(messages: readonly Message[]): MessageListWire {
    return { messages: messages.map((message) => MessageWireUtil.messageSummaryWireFor(message)) };
  },
} as const;
