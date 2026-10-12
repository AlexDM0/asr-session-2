/**
 * The menu panel must keep every destination of the wide header reachable on a phone, so what matters
 * is that it holds the avatar block, the main navigation with the active section and the service links,
 * in that order, under the id the menu button controls. The profile here is synthetic.
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

import { DesignSystemCopyProvider }  from '../../lib/design-system/DesignSystemCopy';
import type { ResourceState }        from '../../lib/resource/useResource';
import { PORTAL_DESIGN_SYSTEM_COPY } from '../../shared/copy/portalDesignSystemCopy';
import type { Profile }              from '../../shared/model/Profile';

import { CompactMenuPanel } from './CompactMenuPanel';

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

const EXAMPLE_PANEL_ID = 'example-menu-panel';

function renderCompactMenuPanel(profileState: ResourceState<Profile>): HTMLElement {
  const { container } = render(
    <MemoryRouter>
      <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
        <CompactMenuPanel activeSection="messages" id={EXAMPLE_PANEL_ID} onProfileRetry={() => undefined} profileState={profileState} />
      </DesignSystemCopyProvider>
    </MemoryRouter>,
  );
  return container;
}

afterEach(cleanup);

describe('CompactMenuPanel', () => {
  it('holds the avatar block, the five sections and the three service links in that order', () => {
    renderCompactMenuPanel({ status: 'loaded', value: SYNTHETIC_PROFILE });

    const linkNames = screen.getAllByRole('link').map((link) => link.textContent);

    expect(linkNames).toEqual([
      'AEAlex Example Klantnr. 12 345 678',
      'Overzicht',
      'Polissen',
      'Schade',
      'Berichten',
      'Profiel',
      'Hulp & contact',
      'Schade melden',
      'logoutUitloggen',
    ]);
  });

  it('lays out "Hoofdmenu" and "Servicemenu" as panel lists with the active section marked', () => {
    renderCompactMenuPanel({ status: 'loaded', value: SYNTHETIC_PROFILE });

    const primaryNavigation = screen.getByRole('navigation', { name: 'Hoofdmenu' });

    expect(primaryNavigation.getAttribute('data-layout')).toBe('panel');
    expect(screen.getByRole('navigation', { name: 'Servicemenu' }).getAttribute('data-layout')).toBe('panel');
    expect(within(primaryNavigation).getByRole('link', { current: 'page' }).textContent).toBe('Berichten');
  });

  it('carries the id the menu button controls', () => {
    const container = renderCompactMenuPanel({ status: 'loading' });

    expect(container.querySelector(`#${EXAMPLE_PANEL_ID}`)).not.toBeNull();
  });

  it('shows the compact error banner in place of the avatar block when the profile read failed', () => {
    renderCompactMenuPanel({ status: 'failed' });

    expect(screen.getByRole('alert').textContent).toContain('Laden mislukt');
    expect(screen.queryByRole('link', { name: /Alex Example/u })).toBeNull();
  });
});
