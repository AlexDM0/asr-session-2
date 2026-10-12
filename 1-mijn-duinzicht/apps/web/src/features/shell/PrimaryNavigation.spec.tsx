/**
 * The main navigation tells the customer where they are, so what matters is the named landmark, the
 * five sections in the designed order with their routes, and that exactly the given section is marked
 * as the current page, with none marked on the not-found page; the menu panel's layout keeps all of that.
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

import type { PortalSection } from '../../shared/sections/PortalPath';

import { PrimaryNavigation, type PrimaryNavigationLayout } from './PrimaryNavigation';

function renderPrimaryNavigation(activeSection: PortalSection, layout: PrimaryNavigationLayout = 'bar'): HTMLElement[] {
  render(<MemoryRouter><PrimaryNavigation activeSection={activeSection} layout={layout} /></MemoryRouter>);
  return within(screen.getByRole('navigation', { name: 'Hoofdmenu' })).getAllByRole('link');
}

afterEach(cleanup);

describe('PrimaryNavigation', () => {
  it('lists Overzicht, Polissen, Schade, Berichten and Profiel in that order with their routes', () => {
    const links = renderPrimaryNavigation('overview');

    expect(links.map((link) => link.textContent)).toEqual(['Overzicht', 'Polissen', 'Schade', 'Berichten', 'Profiel']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/polissen', '/schade', '/berichten', '/profiel']);
  });

  it('marks exactly the given section as the current page', () => {
    for (const [section, label] of [['overview', 'Overzicht'], ['policies', 'Polissen'], ['claims', 'Schade'], ['messages', 'Berichten'], ['profile', 'Profiel']] as const) {
      const links = renderPrimaryNavigation(section);
      const currentLinks = links.filter((link) => link.getAttribute('aria-current') === 'page');

      expect(currentLinks.map((link) => link.textContent)).toEqual([label]);
      cleanup();
    }
  });

  it('marks no item on the not-found page', () => {
    const links = renderPrimaryNavigation('notFound');

    expect(links.filter((link) => link.hasAttribute('aria-current'))).toEqual([]);
  });

  it('mirrors the bar layout by default and the panel layout when asked as data-layout', () => {
    render(<MemoryRouter><PrimaryNavigation activeSection="overview" /></MemoryRouter>);

    expect(screen.getByRole('navigation', { name: 'Hoofdmenu' }).getAttribute('data-layout')).toBe('bar');
    cleanup();

    renderPrimaryNavigation('overview', 'panel');

    expect(screen.getByRole('navigation', { name: 'Hoofdmenu' }).getAttribute('data-layout')).toBe('panel');
  });

  it('keeps the same items, routes and active section in the panel layout', () => {
    const links = renderPrimaryNavigation('messages', 'panel');

    expect(links.map((link) => link.textContent)).toEqual(['Overzicht', 'Polissen', 'Schade', 'Berichten', 'Profiel']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/polissen', '/schade', '/berichten', '/profiel']);
    expect(links.filter((link) => link.getAttribute('aria-current') === 'page').map((link) => link.textContent)).toEqual(['Berichten']);
  });
});
