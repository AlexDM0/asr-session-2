/**
 * Colour never carries meaning alone, so what matters is that the badge shows its label as plain
 * text and that each of the five tones reaches the stylesheet through `data-tone`.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';

import { StatusBadge } from './StatusBadge';

afterEach(cleanup);

describe('StatusBadge', () => {
  it('shows its label as plain text', () => {
    render(<StatusBadge label="Example status" tone="ok" />);

    expect(screen.getByText('Example status').getAttribute('aria-hidden')).toBeNull();
  });

  it('mirrors every tone as data-tone', () => {
    for (const tone of ['ok', 'warn', 'err', 'info', 'neutral'] as const) {
      const { unmount } = render(<StatusBadge label={`Example ${tone}`} tone={tone} />);

      expect(screen.getByText(`Example ${tone}`).dataset['tone']).toBe(tone);
      unmount();
    }
  });
});
