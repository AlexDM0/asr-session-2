/**
 * The service links are a second navigation, so what matters is its name, the three designed links in
 * order, that "Schade melden" leads to the claims section, and that the two links without a flow in
 * this demo are announced as unavailable; the menu panel's layout keeps all of that.
 */
import {
  cleanup,
  render,
  screen,
  within,
} from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { UtilityLinks } from './UtilityLinks';

afterEach(cleanup);

describe('UtilityLinks', () => {
  it('is a navigation named "Servicemenu" with Hulp & contact, Schade melden and Uitloggen in that order', () => {
    render(<MemoryRouter><UtilityLinks /></MemoryRouter>);

    const links = within(screen.getByRole('navigation', { name: 'Servicemenu' })).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual(['Hulp & contact', 'Schade melden', 'logoutUitloggen']);
  });

  it('leads "Schade melden" to /schade', () => {
    render(<MemoryRouter><UtilityLinks /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Schade melden' }).getAttribute('href')).toBe('/schade');
  });

  it('renders Hulp & contact and Uitloggen as unavailable links with a hidden logout icon', () => {
    render(<MemoryRouter><UtilityLinks /></MemoryRouter>);

    for (const name of ['Hulp & contact', 'Uitloggen']) {
      const link = screen.getByRole('link', { name });

      expect(link.getAttribute('aria-disabled')).toBe('true');
      expect(link.hasAttribute('href')).toBe(false);
    }
    expect(screen.getByText('logout').getAttribute('aria-hidden')).toBe('true');
  });

  it('mirrors the bar layout by default and the panel layout when asked as data-layout', () => {
    render(<MemoryRouter><UtilityLinks /></MemoryRouter>);

    expect(screen.getByRole('navigation', { name: 'Servicemenu' }).getAttribute('data-layout')).toBe('bar');
    cleanup();

    render(<MemoryRouter><UtilityLinks layout="panel" /></MemoryRouter>);

    expect(screen.getByRole('navigation', { name: 'Servicemenu' }).getAttribute('data-layout')).toBe('panel');
  });

  it('keeps the same three links, route and unavailable links in the panel layout', () => {
    render(<MemoryRouter><UtilityLinks layout="panel" /></MemoryRouter>);

    const links = within(screen.getByRole('navigation', { name: 'Servicemenu' })).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual(['Hulp & contact', 'Schade melden', 'logoutUitloggen']);
    expect(screen.getByRole('link', { name: 'Schade melden' }).getAttribute('href')).toBe('/schade');
    expect(screen.getByRole('link', { name: 'Uitloggen' }).getAttribute('aria-disabled')).toBe('true');
  });
});
