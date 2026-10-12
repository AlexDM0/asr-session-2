/** The message order: newest date first, and the id ascending breaks a tie on the same date. */
import { describe, expect, it } from 'bun:test';

import type { Message } from '../../shared/model/Message';

import { MessageOrderUtil } from './MessageOrderUtil';

function syntheticMessage(id: string, sentOn: string): Message {
  return {
    id, title: 'Example message', sentOn, isRead: false, body: 'Example body',
  };
}

describe('MessageOrderUtil.inListOrder', () => {
  it('orders messages by date, newest first', () => {
    const ordered = MessageOrderUtil.inListOrder([
      syntheticMessage('EX-1', '2099-01-01'),
      syntheticMessage('EX-2', '2099-03-01'),
      syntheticMessage('EX-3', '2099-02-01'),
    ]);

    expect(ordered.map((message) => message.id)).toEqual(['EX-2', 'EX-3', 'EX-1']);
  });

  it('breaks a tie on the same date by id ascending', () => {
    const ordered = MessageOrderUtil.inListOrder([syntheticMessage('EX-B', '2099-01-01'), syntheticMessage('EX-A', '2099-01-01')]);

    expect(ordered.map((message) => message.id)).toEqual(['EX-A', 'EX-B']);
  });
});
