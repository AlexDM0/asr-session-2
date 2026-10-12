/** The wire util pins the message list and detail answers: the list leaves out the body, the detail adds it. */
import { describe, expect, it } from 'bun:test';

import { MessageWireUtil } from './MessageWireUtil';

const EXAMPLE_MESSAGE = {
  id:     'EX-MESSAGE-1',
  title:  'Example message',
  sentOn: '2099-01-02',
  isRead: false,
  body:   'Example paragraph.\n\nExample second paragraph.',
};

describe('MessageWireUtil', () => {
  it('maps a message to the summary fields without the body', () => {
    expect(MessageWireUtil.messageSummaryWireFor(EXAMPLE_MESSAGE)).toStrictEqual({
      id:     'EX-MESSAGE-1',
      title:  'Example message',
      sentOn: '2099-01-02',
      isRead: false,
    });
  });

  it('adds the body to the detail', () => {
    expect(MessageWireUtil.messageDetailWireFor(EXAMPLE_MESSAGE)).toStrictEqual(EXAMPLE_MESSAGE);
  });

  it('wraps the summaries in a messages list', () => {
    expect(MessageWireUtil.messageListWireFor([EXAMPLE_MESSAGE])).toStrictEqual({
      messages: [{
        id: 'EX-MESSAGE-1', title: 'Example message', sentOn: '2099-01-02', isRead: false,
      }],
    });
  });
});
