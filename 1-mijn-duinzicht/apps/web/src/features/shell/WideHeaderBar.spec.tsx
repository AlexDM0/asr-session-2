/**
 * The wide bar composes the header for wide screens, so what matters is the order of its parts as
 * a keyboard and screen-reader user meets them: utility links, wordmark, the navigation with the active
 * section, then the avatar block. The profile here is synthetic.
 */
import { cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { DesignSystemCopyProvider }  from '../../lib/design-system/DesignSystemCopy';
import { PORTAL_DESIGN_SYSTEM_COPY } from '../../shared/copy/portalDesignSystemCopy';
import type { Profile }              from '../../shared/model/Profile';

import { WideHeaderBar } from './WideHeaderBar';

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

afterEach(cleanup);

describe('WideHeaderBar', () => {
  it('renders the utility links, the wordmark, the navigation and the avatar block in that order', () => {
    render(
      <MemoryRouter>
        <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
          <WideHeaderBar activeSection="claims" onProfileRetry={() => undefined} profileState={{ status: 'loaded', value: SYNTHETIC_PROFILE }} />
        </DesignSystemCopyProvider>
      </MemoryRouter>,
    );

    const linkNames = screen.getAllByRole('link').map((link) => link.getAttribute('aria-label') ?? link.textContent);

    expect(linkNames).toEqual([
      'Hulp & contact',
      'Schade melden',
      'logoutUitloggen',
      'Duinzicht Verzekeringen, naar je overzicht',
      'Overzicht',
      'Polissen',
      'Schade',
      'Berichten',
      'Profiel',
      'AEAlex Example Klantnr. 12 345 678',
    ]);
  });

  it('marks the given section as active in the navigation', () => {
    render(
      <MemoryRouter>
        <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
          <WideHeaderBar activeSection="claims" onProfileRetry={() => undefined} profileState={{ status: 'loading' }} />
        </DesignSystemCopyProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { current: 'page' }).textContent).toBe('Schade');
  });
});
