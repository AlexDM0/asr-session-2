/**
 * The avatar block is the first data-backed view, so what matters is each state of the profile read:
 * loaded (link to the profile, hidden initials, name and formatted customer number), loading (a round
 * skeleton and two bars inside the announced loading region) and failed (the compact error banner in
 * its place, whose retry repeats the read). The profile here is synthetic.
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent                   from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { DesignSystemCopyProvider }  from '../../lib/design-system/DesignSystemCopy';
import type { ResourceState }        from '../../lib/resource/useResource';
import { PORTAL_DESIGN_SYSTEM_COPY } from '../../shared/copy/portalDesignSystemCopy';
import type { Profile }              from '../../shared/model/Profile';

import { AvatarBlock } from './AvatarBlock';

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

function renderAvatarBlock(profileState: ResourceState<Profile>, onRetry: () => void = () => undefined): HTMLElement {
  const { container } = render(
    <MemoryRouter>
      <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
        <AvatarBlock onRetry={onRetry} profileState={profileState} />
      </DesignSystemCopyProvider>
    </MemoryRouter>,
  );
  return container;
}

afterEach(cleanup);

describe('AvatarBlock', () => {
  it('links to /profiel, named by the full name and "Klantnr. " with the formatted customer number', () => {
    renderAvatarBlock({ status: 'loaded', value: SYNTHETIC_PROFILE });

    expect(screen.getByRole('link', { name: 'Alex Example Klantnr. 12 345 678' }).getAttribute('href')).toBe('/profiel');
  });

  it('shows the initials but hides them from assistive technology', () => {
    renderAvatarBlock({ status: 'loaded', value: SYNTHETIC_PROFILE });

    expect(screen.getByText('AE').getAttribute('aria-hidden')).toBe('true');
  });

  it('shows a round skeleton and two bars inside a loading region announcing "Bezig met laden…" while loading', () => {
    const container = renderAvatarBlock({ status: 'loading' });

    const skeletonShapes = [...container.querySelectorAll<HTMLElement>('[data-shape]')].map((skeleton) => skeleton.dataset['shape']);

    expect(screen.getByRole('status').textContent).toBe('Bezig met laden…');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(skeletonShapes).toEqual(['round', 'block', 'block']);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the compact error banner "Laden mislukt" in place of the block when the read failed', () => {
    renderAvatarBlock({ status: 'failed' });

    const banner = screen.getByRole('alert');

    expect(banner.dataset['variant']).toBe('compact');
    expect(banner.textContent).toContain('Laden mislukt');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('calls the retry when "Opnieuw proberen" is activated', async () => {
    const user = userEvent.setup();
    const onRetry = mock(() => undefined);
    renderAvatarBlock({ status: 'failed' }, onRetry);

    await user.click(screen.getByRole('button', { name: 'Opnieuw proberen' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
