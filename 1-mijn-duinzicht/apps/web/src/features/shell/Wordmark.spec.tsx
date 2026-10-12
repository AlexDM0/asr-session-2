/**
 * The wordmark is both the logotype and the way home, so what matters is that it is one link to the
 * overview with its spoken name, while its visible letters stay out of the
 * accessibility tree.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { Wordmark } from './Wordmark';

afterEach(cleanup);

describe('Wordmark', () => {
  it('is a link to the overview named "Duinzicht Verzekeringen, naar je overzicht"', () => {
    render(<MemoryRouter><Wordmark /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Duinzicht Verzekeringen, naar je overzicht' }).getAttribute('href')).toBe('/');
  });

  it('shows "duinzicht." and the tagline while hiding them from assistive technology', () => {
    render(<MemoryRouter><Wordmark /></MemoryRouter>);

    const name = screen.getByText('duinzicht', { exact: false });
    const tagline = screen.getByText('Verzekeringen');

    expect(name.textContent).toBe('duinzicht.');
    expect(name.getAttribute('aria-hidden')).toBe('true');
    expect(tagline.getAttribute('aria-hidden')).toBe('true');
  });
});
