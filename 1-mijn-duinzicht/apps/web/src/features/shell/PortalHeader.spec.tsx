/**
 * The header is the banner of every page and the one reader of the profile, so what matters is the
 * landmark, that the profile is read once per page load and not again when the page changes, and the
 * full failure path of that read: the compact banner, the skeleton during the one repeated read, the
 * avatar block once it succeeds, and the time limit that fails a silent read and ignores its late answer.
 * In compact layout mode the menu is a non-modal disclosure, so every way it closes is pinned, and the
 * one profile read feeds the panel's avatar block too. Profiles here are synthetic.
 */
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it,
  jest,
  mock,
  spyOn,
} from 'bun:test';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';

import { DesignSystemCopyProvider }  from '../../lib/design-system/DesignSystemCopy';
import { READ_TIMEOUT_MILLISECONDS } from '../../lib/resource/useResource';
import { PORTAL_DESIGN_SYSTEM_COPY } from '../../shared/copy/portalDesignSystemCopy';
import type { Profile }              from '../../shared/model/Profile';

import { PortalHeader }           from './PortalHeader';
import type { PortalRouteHandle } from './PortalRouteHandle';

const SYNTHETIC_PROFILE: Profile = {
  customerNumber:                '12345678',
  fullName:                      'Alex Example',
  firstName:                     'Alex',
  initials:                      'AE',
  birthDate:                     '2000-01-02',
  emailAddress:                  'alex@example.com',
  emailAddressNeedsConfirmation: false,
  emailAddressLastConfirmedYear: 2020,
  phoneNumber:                   '06 00 00 00 00',
  address:                       { streetAndHouseNumber: 'Example Street 1', postcode: '1234 AB', city: 'Example City' },
  iban:                          'NL00 EXAM 0000 0000 00',
  paymentMethod:                 'monthlyDirectDebit',
  accountHolder:                 'A. Example',
};

const AVATAR_LINK_NAME = 'Alex Example Klantnr. 12 345 678';

type ProfileAnswer = () => Promise<Response>;

const OVERVIEW_HANDLE: PortalRouteHandle = { section: 'overview' };
const POLICIES_HANDLE: PortalRouteHandle = { section: 'policies' };
const MESSAGES_HANDLE: PortalRouteHandle = { section: 'messages' };

const LAYOUT_ATTRIBUTE = 'data-layout';

function stubFetchWithAnswers(answers: readonly ProfileAnswer[]): string[] {
  const requestedAddresses: string[] = [];
  const answeringFetch = Object.assign((input: RequestInfo | URL): Promise<Response> => {
    const answer = answers[requestedAddresses.length] ?? answers.at(-1);
    requestedAddresses.push(String(input));
    if (answer === undefined) {
      throw new Error('The spec gave no answer for this request.');
    }
    return answer();
  }, { preconnect: globalThis.fetch.preconnect });
  spyOn(globalThis, 'fetch').mockImplementation(answeringFetch);
  return requestedAddresses;
}

const answerWithProfile: ProfileAnswer = () => Promise.resolve(Response.json(SYNTHETIC_PROFILE));
const answerWithServerError: ProfileAnswer = () => Promise.resolve(Response.json({ error: { code: 'internalError', message: 'Example failure.' } }, { status: 500 }));

function renderHeaderInRouter(): ReturnType<typeof createMemoryRouter> {
  const router = createMemoryRouter([
    {
      element: (
        <>
          <PortalHeader />
          <main>
            <a href="#example-content">Example content link</a>
            <Outlet />
          </main>
        </>
      ),
      children: [
        { path: '/', element: <p>Example overview page</p>, handle: OVERVIEW_HANDLE },
        { path: '/polissen', element: <p>Example policies page</p>, handle: POLICIES_HANDLE },
        { path: '/berichten', element: <p>Example messages page</p>, handle: MESSAGES_HANDLE },
      ],
    },
  ], { initialEntries: ['/'] });
  render(
    <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
      <RouterProvider router={router} />
    </DesignSystemCopyProvider>,
  );
  return router;
}

function useCompactLayoutMode(): void {
  document.documentElement.setAttribute(LAYOUT_ATTRIBUTE, 'compact');
}

// The layout mode reaches React through a mutation observer, whose records arrive in a microtask, so the change is awaited inside act.
async function switchLayoutModeTo(layoutMode: 'compact' | 'wide'): Promise<void> {
  await act(async () => {
    document.documentElement.setAttribute(LAYOUT_ATTRIBUTE, layoutMode);
  });
}

async function openMenuWith(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  const menuButton = screen.getByRole('button', { name: 'Menu openen' });
  await user.click(menuButton);
  return menuButton;
}

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute(LAYOUT_ATTRIBUTE);
  mock.restore();
  jest.useRealTimers();
});

describe('PortalHeader', () => {
  it('is the banner landmark holding the wide bar with the route\'s active section', async () => {
    stubFetchWithAnswers([answerWithProfile]);
    renderHeaderInRouter();

    const banner = screen.getByRole('banner');

    expect(banner.tagName).toBe('HEADER');
    expect(screen.getByRole('navigation', { name: 'Hoofdmenu' })).toBeDefined();
    expect(screen.getByRole('link', { current: 'page' }).textContent).toBe('Overzicht');
    await waitFor(() => expect(screen.getByRole('link', { name: AVATAR_LINK_NAME })).toBeDefined());
  });

  it('reads the profile once through /api/profile and not again when the page changes', async () => {
    const requestedAddresses = stubFetchWithAnswers([answerWithProfile]);
    const router = renderHeaderInRouter();
    await waitFor(() => expect(screen.getByRole('link', { name: AVATAR_LINK_NAME })).toBeDefined());

    await act(() => router.navigate('/polissen'));

    expect(screen.getByText('Example policies page')).toBeDefined();
    expect(screen.getByRole('link', { current: 'page' }).textContent).toBe('Polissen');
    expect(requestedAddresses).toEqual(['/api/profile']);
  });

  it('shows the compact banner after a failed read, the skeleton during the one repeated read, then the avatar block', async () => {
    const user = userEvent.setup();
    let answerRepeatedRead: (response: Response) => void = () => undefined;
    const answerLater: ProfileAnswer = () => new Promise((resolve) => {
      answerRepeatedRead = resolve;
    });
    const requestedAddresses = stubFetchWithAnswers([answerWithServerError, answerLater]);
    renderHeaderInRouter();

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Laden mislukt'));
    await user.click(screen.getByRole('button', { name: 'Opnieuw proberen' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Bezig met laden…');
    expect(requestedAddresses).toHaveLength(2);

    await act(async () => answerRepeatedRead(Response.json(SYNTHETIC_PROFILE)));

    await waitFor(() => expect(screen.getByRole('link', { name: AVATAR_LINK_NAME })).toBeDefined());
    expect(requestedAddresses).toHaveLength(2);
  });

  it('shows the compact banner when the read gives no answer within the time limit and ignores its late answer', async () => {
    jest.useFakeTimers();
    let answerLateRead: (response: Response) => void = () => undefined;
    stubFetchWithAnswers([() => new Promise((resolve) => {
      answerLateRead = resolve;
    })]);
    renderHeaderInRouter();

    expect(screen.getByRole('status').textContent).toBe('Bezig met laden…');
    act(() => {
      jest.advanceTimersByTime(READ_TIMEOUT_MILLISECONDS);
    });

    expect(screen.getByRole('alert').textContent).toContain('Laden mislukt');

    await act(async () => answerLateRead(Response.json(SYNTHETIC_PROFILE)));

    expect(screen.getByRole('alert').textContent).toContain('Laden mislukt');
    expect(screen.queryByRole('link', { name: AVATAR_LINK_NAME })).toBeNull();
  });
});

describe('PortalHeader in compact layout mode', () => {
  it('replaces the wide bar with the compact bar and a closed menu', async () => {
    useCompactLayoutMode();
    stubFetchWithAnswers([answerWithProfile]);
    renderHeaderInRouter();

    expect(screen.getByRole('button', { name: 'Menu openen' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('navigation', { name: 'Hoofdmenu' })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Servicemenu' })).toBeNull();
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.queryByRole('link', { name: AVATAR_LINK_NAME })).toBeNull();
  });

  it('opens the panel with the button and closes it with the button again', async () => {
    useCompactLayoutMode();
    const user = userEvent.setup();
    stubFetchWithAnswers([answerWithProfile]);
    renderHeaderInRouter();

    const menuButton = await openMenuWith(user);

    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(menuButton.getAttribute('aria-label')).toBe('Menu sluiten');
    expect(document.getElementById(menuButton.getAttribute('aria-controls') ?? '')).not.toBeNull();
    expect(screen.getByRole('navigation', { name: 'Hoofdmenu' })).toBeDefined();
    await waitFor(() => expect(screen.getByRole('link', { name: AVATAR_LINK_NAME })).toBeDefined());

    await user.click(menuButton);

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('navigation', { name: 'Hoofdmenu' })).toBeNull();
  });

  it('closes when a panel link changes the address and marks that section the next time it opens', async () => {
    useCompactLayoutMode();
    const user = userEvent.setup();
    stubFetchWithAnswers([answerWithProfile]);
    const router = renderHeaderInRouter();
    await openMenuWith(user);

    await user.click(screen.getByRole('link', { name: 'Berichten' }));

    expect(router.state.location.pathname).toBe('/berichten');
    expect(screen.queryByRole('navigation', { name: 'Hoofdmenu' })).toBeNull();

    await openMenuWith(user);

    expect(screen.getByRole('link', { current: 'page' }).textContent).toBe('Berichten');
  });

  it('stays closed when the customer goes back to the page where the menu was opened', async () => {
    useCompactLayoutMode();
    const user = userEvent.setup();
    stubFetchWithAnswers([answerWithProfile]);
    const router = renderHeaderInRouter();
    await openMenuWith(user);
    await user.click(screen.getByRole('link', { name: 'Polissen' }));

    await act(() => router.navigate(-1));

    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('button', { name: 'Menu openen' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape and returns focus to the menu button', async () => {
    useCompactLayoutMode();
    const user = userEvent.setup();
    stubFetchWithAnswers([answerWithProfile]);
    renderHeaderInRouter();
    const menuButton = await openMenuWith(user);
    screen.getByRole('link', { name: 'Polissen' }).focus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('navigation', { name: 'Hoofdmenu' })).toBeNull();
    expect(document.activeElement).toBe(menuButton);
    expect(menuButton.getAttribute('aria-label')).toBe('Menu openen');
  });

  it('closes on a pointer press outside the header and stays open on one inside it', async () => {
    useCompactLayoutMode();
    const user = userEvent.setup();
    stubFetchWithAnswers([answerWithProfile]);
    renderHeaderInRouter();
    await openMenuWith(user);

    await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('navigation', { name: 'Hoofdmenu' }) });

    expect(screen.getByRole('navigation', { name: 'Hoofdmenu' })).toBeDefined();

    await user.pointer({ keys: '[MouseLeft]', target: screen.getByText('Example overview page') });

    expect(screen.queryByRole('navigation', { name: 'Hoofdmenu' })).toBeNull();
  });

  it('closes when Tab leaves the header from the last panel item and lets focus continue into the main content', async () => {
    useCompactLayoutMode();
    const user = userEvent.setup();
    stubFetchWithAnswers([answerWithProfile]);
    renderHeaderInRouter();
    await openMenuWith(user);
    screen.getByRole('link', { name: 'Uitloggen' }).focus();

    await user.tab();

    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Example content link' }));
    expect(screen.queryByRole('navigation', { name: 'Hoofdmenu' })).toBeNull();
  });

  it('stays open while Tab moves between items inside the panel', async () => {
    useCompactLayoutMode();
    const user = userEvent.setup();
    stubFetchWithAnswers([answerWithProfile]);
    renderHeaderInRouter();
    await openMenuWith(user);
    screen.getByRole('link', { name: 'Overzicht' }).focus();

    await user.tab();

    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Polissen' }));
    expect(screen.getByRole('navigation', { name: 'Hoofdmenu' })).toBeDefined();
  });

  it('closes and shows the wide bar when the layout mode becomes wide, and stays closed back in compact mode', async () => {
    useCompactLayoutMode();
    const user = userEvent.setup();
    stubFetchWithAnswers([answerWithProfile]);
    renderHeaderInRouter();
    await openMenuWith(user);

    await switchLayoutModeTo('wide');

    expect(screen.queryByRole('button', { name: /^Menu/u })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Servicemenu' })).toBeDefined();

    await switchLayoutModeTo('compact');

    expect(screen.getByRole('button', { name: 'Menu openen' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('navigation', { name: 'Hoofdmenu' })).toBeNull();
  });

  it('reads the profile once however often the menu opens and the layout mode changes', async () => {
    useCompactLayoutMode();
    const user = userEvent.setup();
    const requestedAddresses = stubFetchWithAnswers([answerWithProfile]);
    renderHeaderInRouter();
    await openMenuWith(user);
    await waitFor(() => expect(screen.getByRole('link', { name: AVATAR_LINK_NAME })).toBeDefined());
    await user.click(screen.getByRole('button', { name: 'Menu sluiten' }));
    await openMenuWith(user);
    await switchLayoutModeTo('wide');

    expect(screen.getByRole('link', { name: AVATAR_LINK_NAME })).toBeDefined();

    expect(requestedAddresses).toEqual(['/api/profile']);
  });

  it('shows the compact error banner in the panel\'s avatar block when the read failed, and its retry repeats the read', async () => {
    useCompactLayoutMode();
    const user = userEvent.setup();
    const requestedAddresses = stubFetchWithAnswers([answerWithServerError, answerWithProfile]);
    renderHeaderInRouter();
    await openMenuWith(user);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Laden mislukt'));
    await user.click(screen.getByRole('button', { name: 'Opnieuw proberen' }));

    await waitFor(() => expect(screen.getByRole('link', { name: AVATAR_LINK_NAME })).toBeDefined());
    expect(requestedAddresses).toEqual(['/api/profile', '/api/profile']);
  });
});
