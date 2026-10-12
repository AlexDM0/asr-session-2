/**
 * IconCircle is pure decoration beside a labelled title, so what matters is that it is hidden from
 * assistive technology, that size and tone reach the stylesheet through `data-*` (sage by default),
 * and that each circle size carries its matching icon size.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it
} from 'bun:test';

import { IconCircle } from './IconCircle';

afterEach(cleanup);

describe('IconCircle', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(<IconCircle icon="home" size="small" />);

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses the sage tone by default and mirrors size and tone as data attributes', () => {
    const { container, rerender } = render(<IconCircle icon="home" size="medium" />);
    const circle = container.firstElementChild;

    expect(circle?.getAttribute('data-size')).toBe('medium');
    expect(circle?.getAttribute('data-tone')).toBe('sage');
    rerender(<IconCircle icon="home" size="large" tone="cream" />);
    expect(circle?.getAttribute('data-size')).toBe('large');
    expect(circle?.getAttribute('data-tone')).toBe('cream');
  });

  it('gives each circle size its own icon size: 24px, 28px and 32px', () => {
    const expectedIconSizes = { small: 'default', medium: 'large', large: 'extraLarge' } as const;

    for (const [circleSize, iconSize] of Object.entries(expectedIconSizes)) {
      const { unmount } = render(<IconCircle icon="chair" size={circleSize as keyof typeof expectedIconSizes} />);

      expect(screen.getByText('chair').dataset['size']).toBe(iconSize);
      unmount();
    }
  });
});
