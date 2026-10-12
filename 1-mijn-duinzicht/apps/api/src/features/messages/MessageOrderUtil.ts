import type { Message } from '../../shared/model/Message';

export const MessageOrderUtil = {
  /** Date newest first, then id ascending. */
  inListOrder(messages: readonly Message[]): Message[] {
    return messages.toSorted((a, b) => {
      if (a.sentOn !== b.sentOn) {
        return a.sentOn > b.sentOn ? -1 : 1;
      }
      return a.id < b.id ? -1 : Number(a.id > b.id);
    });
  },
} as const;
