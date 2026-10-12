/**
 * The route table is the shell's contract with every section, so this spec checks only shell
 * behaviour per address: the active navigation item, the tab title, the not-found routing of
 * addresses outside the portal, focus on the main content after navigation, and history. It never
 * asserts a page's content, so replacing a placeholder page cannot break it. `fetch` never answers.
 */
import {
  act,
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
  mock,
  spyOn,
} from 'bun:test';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { DesignSystemCopyProvider }  from './lib/design-system/DesignSystemCopy';
import { PORTAL_ROUTES }             from './portalRoutes';
import { PORTAL_DESIGN_SYSTEM_COPY } from './shared/copy/portalDesignSystemCopy';

type PortalRouter = ReturnType<typeof createMemoryRouter>;

const SECTION_ADDRESSES = [
  { address: '/', activeItem: 'Overzicht', title: 'Overzicht · Mijn Duinzicht' },
  { address: '/polissen', activeItem: 'Polissen', title: 'Polissen · Mijn Duinzicht' },
  { address: '/polissen/', activeItem: 'Polissen', title: 'Polissen · Mijn Duinzicht' },
  { address: '/schade', activeItem: 'Schade', title: 'Schade · Mijn Duinzicht' },
  { address: '/profiel', activeItem: 'Profiel', title: 'Profiel · Mijn Duinzicht' },
  { address: '/berichten', activeItem: 'Berichten', title: 'Berichten · Mijn Duinzicht' },
] as const;

const ADDRESSES_OUTSIDE_THE_PORTAL = ['/bestaat-niet', '/overzicht', '/berichten/a/b', '/polissen/example', '/POLISSEN'] as const;

function stubFetchWithoutAnswer(): void {
  const silentFetch = Object.assign((): Promise<Response> => new Promise(() => undefined), { preconnect: globalThis.fetch.preconnect });
  spyOn(globalThis, 'fetch').mockImplementation(silentFetch);
}

function renderPortalAt(address: string): PortalRouter {
  stubFetchWithoutAnswer();
  const router = createMemoryRouter(PORTAL_ROUTES, { initialEntries: [address] });
  render(
    <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
      <RouterProvider router={router} />
    </DesignSystemCopyProvider>,
  );
  return router;
}

function activeItemNames(): (string | null)[] {
  const navigation = screen.getByRole('navigation', { name: 'Hoofdmenu' });
  return within(navigation).queryAllByRole('link', { current: 'page' }).map((link) => link.textContent);
}

async function navigateTo(router: PortalRouter, destination: string | number): Promise<void> {
  await act(() => (typeof destination === 'number' ? router.navigate(destination) : router.navigate(destination)));
}

afterEach(() => {
  cleanup();
  mock.restore();
});

describe('PORTAL_ROUTES', () => {
  it('marks the section\'s item active and sets its tab title for every portal address', () => {
    for (const { address, activeItem, title } of SECTION_ADDRESSES) {
      renderPortalAt(address);

      expect({ address, activeItems: activeItemNames(), title: document.title }).toEqual({ address, activeItems: [activeItem], title });
      cleanup();
      mock.restore();
    }
  });

  it('shows the not-found page with no item active for every address outside the portal', () => {
    for (const address of ADDRESSES_OUTSIDE_THE_PORTAL) {
      renderPortalAt(address);

      expect({ address, activeItems: activeItemNames(), title: document.title }).toEqual({ address, activeItems: [], title: 'Pagina niet gevonden · Mijn Duinzicht' });
      expect(screen.getByRole('heading', { level: 1, name: 'Pagina niet gevonden' })).toBeDefined();
      cleanup();
      mock.restore();
    }
  });

  it('leaves focus at the document on the first render', () => {
    renderPortalAt('/');

    expect(document.activeElement).toBe(document.body);
  });

  it('moves focus to the main content when navigating from / to /polissen', async () => {
    const router = renderPortalAt('/');

    await navigateTo(router, '/polissen');

    expect(document.activeElement).toBe(screen.getByRole('main'));
  });

  it('restores the earlier page and its active item on back and forward', async () => {
    const router = renderPortalAt('/');
    await navigateTo(router, '/polissen');
    await navigateTo(router, '/schade');

    await navigateTo(router, -1);
    expect({ pathname: router.state.location.pathname, activeItems: activeItemNames(), title: document.title })
      .toEqual({ pathname: '/polissen', activeItems: ['Polissen'], title: 'Polissen · Mijn Duinzicht' });
    expect(document.activeElement).toBe(screen.getByRole('main'));

    await navigateTo(router, 1);
    expect({ pathname: router.state.location.pathname, activeItems: activeItemNames(), title: document.title })
      .toEqual({ pathname: '/schade', activeItems: ['Schade'], title: 'Schade · Mijn Duinzicht' });
  });
});
