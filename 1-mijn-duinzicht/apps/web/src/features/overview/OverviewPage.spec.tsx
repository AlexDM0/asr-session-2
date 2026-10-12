/**
 * The page is what the route table mounts at `/`, so what matters is that the hero renders inside
 * the shell and "Overzicht" is the active navigation item. `fetch` never answers.
 */
import {
  cleanup,
  render,
  screen,
  within
} from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
  mock,
  spyOn
} from 'bun:test';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { DesignSystemCopyProvider }  from '../../lib/design-system/DesignSystemCopy';
import { PORTAL_ROUTES }             from '../../portalRoutes';
import { PORTAL_DESIGN_SYSTEM_COPY } from '../../shared/copy/portalDesignSystemCopy';

afterEach(() => {
  cleanup();
  mock.restore();
});

describe('OverviewPage', () => {
  it('renders the hero inside the shell with Overzicht marked active', () => {
    const silentFetch = Object.assign((): Promise<Response> => new Promise(() => undefined), { preconnect: globalThis.fetch.preconnect });
    spyOn(globalThis, 'fetch').mockImplementation(silentFetch);
    render(
      <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
        <RouterProvider router={createMemoryRouter(PORTAL_ROUTES, { initialEntries: ['/'] })} />
      </DesignSystemCopyProvider>,
    );

    const main = screen.getByRole('main');
    expect(within(main).getByRole('link', { name: 'Schade melden' })).toBeDefined();
    expect(within(main).getByRole('link', { name: 'Bekijk mijn polissen' })).toBeDefined();
    const navigation = screen.getByRole('navigation', { name: 'Hoofdmenu' });
    expect(within(navigation).getByRole('link', { current: 'page' }).textContent).toBe('Overzicht');
  });
});
