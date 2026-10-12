/**
 * The placeholder holds a section's place until its feature ships, so what matters is that it shows
 * the given breadcrumb and level-1 heading with the under-construction line, leaves the breadcrumb out
 * when none is given, and never requests data. The section here is synthetic.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { DesignSystemCopyProvider }  from '../../lib/design-system/DesignSystemCopy';
import { PORTAL_DESIGN_SYSTEM_COPY } from '../copy/portalDesignSystemCopy';

import { PlaceholderPage, type PlaceholderPageProps } from './PlaceholderPage';

function renderPlaceholderPage(props: PlaceholderPageProps): void {
  render(
    <MemoryRouter>
      <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
        <PlaceholderPage {...props} />
      </DesignSystemCopyProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  mock.restore();
});

describe('PlaceholderPage', () => {
  it('shows the breadcrumb, the level-1 heading and the under-construction line', () => {
    renderPlaceholderPage({ heading: 'Example section heading', breadcrumbItems: [{ label: 'Example start', to: '/example' }, { label: 'Example section' }] });

    expect(screen.getByRole('navigation', { name: 'Kruimelpad' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Example start' }).getAttribute('href')).toBe('/example');
    expect(screen.getByText('Example section').getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('heading', { level: 1, name: 'Example section heading' })).toBeDefined();
    expect(screen.getByText('Deze pagina is nog in aanbouw.')).toBeDefined();
  });

  it('shows no breadcrumb when none is given', () => {
    renderPlaceholderPage({ heading: 'Example section heading' });

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Example section heading' })).toBeDefined();
  });

  it('makes no request', () => {
    const fetchSpy = spyOn(globalThis, 'fetch');

    renderPlaceholderPage({ heading: 'Example section heading', breadcrumbItems: [{ label: 'Example start', to: '/example' }, { label: 'Example section' }] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
