/**
 * The not-found page is the only page the shell owns, so what matters is its heading, its lead text
 * verbatim, and the way back to the overview.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { NotFoundPage } from './NotFoundPage';

afterEach(cleanup);

describe('NotFoundPage', () => {
  it('shows the heading "Pagina niet gevonden" and the lead text verbatim', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: 'Pagina niet gevonden' })).toBeDefined();
    expect(screen.getByText('De pagina die je zoekt bestaat niet (meer). Controleer het adres of ga terug naar je overzicht.')).toBeDefined();
  });

  it('offers "Naar mijn overzicht" as a link to the overview', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);

    const link = screen.getByRole('link', { name: 'Naar mijn overzicht' });

    expect(link.getAttribute('href')).toBe('/');
    expect(link.dataset['variant']).toBe('secondary');
  });
});
