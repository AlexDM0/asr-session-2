/**
 * The layout is the frame of every page, so what matters is that the header comes first and the
 * route's page renders inside the one main landmark, which the shell and the skip link can focus by id.
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent                   from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { DesignSystemCopyProvider }  from '../../lib/design-system/DesignSystemCopy';
import { PORTAL_DESIGN_SYSTEM_COPY } from '../../shared/copy/portalDesignSystemCopy';

import { PortalLayout }           from './PortalLayout';
import type { PortalRouteHandle } from './PortalRouteHandle';

const EXAMPLE_HANDLE: PortalRouteHandle = { section: 'overview' };

function stubFetchWithoutAnswer(): void {
  const silentFetch = Object.assign((): Promise<Response> => new Promise(() => undefined), { preconnect: globalThis.fetch.preconnect });
  spyOn(globalThis, 'fetch').mockImplementation(silentFetch);
}

afterEach(() => {
  cleanup();
  mock.restore();
});

function renderPortalLayout(): void {
  stubFetchWithoutAnswer();
  const router = createMemoryRouter([
    { Component: PortalLayout, children: [{ path: '/', element: <p>Example page</p>, handle: EXAMPLE_HANDLE }] },
  ]);
  render(
    <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
      <RouterProvider router={router} />
    </DesignSystemCopyProvider>,
  );
}

describe('PortalLayout', () => {
  it('renders the header, then a focusable main#main-content holding the route\'s page', () => {
    renderPortalLayout();

    const banner = screen.getByRole('banner');
    const main = screen.getByRole('main');

    expect(main.id).toBe('main-content');
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(main.contains(screen.getByText('Example page'))).toBe(true);
    expect(banner.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the skip link before the header, as the first element the first Tab reaches', async () => {
    const user = userEvent.setup();
    renderPortalLayout();
    const skipLink = screen.getByRole('link', { name: 'Naar de inhoud' });

    await user.tab();

    expect(document.activeElement).toBe(skipLink);
    expect(skipLink.getAttribute('href')).toBe('#main-content');
    expect(skipLink.compareDocumentPosition(screen.getByRole('banner')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('moves focus to the main content when the skip link is activated with Enter', async () => {
    const user = userEvent.setup();
    renderPortalLayout();

    await user.tab();
    await user.keyboard('{Enter}');

    expect(document.activeElement).toBe(screen.getByRole('main'));
  });
});
