/**
 * Icons are ligature text in the icon font, so what matters is that the ligature name is rendered
 * exactly, that the icon is always hidden from assistive technology (the control carries the
 * label) and that the size variant reaches the stylesheet through `data-size`.
 */
import { render, screen }       from '@testing-library/react';
import { describe, expect, it } from 'bun:test';

import { Icon } from './Icon';

describe('Icon', () => {
  it('renders the ligature name in a span hidden from assistive technology', () => {
    render(<Icon name="chevron_right" />);

    const icon = screen.getByText('chevron_right');

    expect(icon.tagName).toBe('SPAN');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('uses the default size when no size is given', () => {
    render(<Icon name="logout" />);

    expect(screen.getByText('logout').dataset['size']).toBe('default');
  });

  it('mirrors every size variant as data-size', () => {
    for (const size of ['small', 'medium', 'default', 'large', 'extraLarge'] as const) {
      const { unmount } = render(<Icon name="menu" size={size} />);

      expect(screen.getByText('menu').dataset['size']).toBe(size);
      unmount();
    }
  });
});
