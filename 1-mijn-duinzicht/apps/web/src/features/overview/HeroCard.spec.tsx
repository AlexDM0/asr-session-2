/**
 * The hero is the landing view, so what matters is one h1 with the greeting and the lead only when
 * loaded, skeletons and no h1 while loading, the hero banner with a retry when failed, and both
 * buttons with their destinations in every state.
 */
import {
  cleanup,
  render,
  screen,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it,
  mock
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { DesignSystemCopyProvider }  from '../../lib/design-system/DesignSystemCopy';
import { PORTAL_DESIGN_SYSTEM_COPY } from '../../shared/copy/portalDesignSystemCopy';

import { HeroCard }       from './HeroCard';
import type { HeroState } from './HeroSummaryUtil';

const LOADED_HERO: HeroState = { status: 'loaded', value: { firstName: 'Alex', activePolicyCount: 3, openClaimCount: 1 } };

function renderHero(heroState: HeroState, onRetry: () => void = () => undefined): void {
  render(
    <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
      <MemoryRouter>
        <HeroCard dayPart="afternoon" onRetry={onRetry} heroState={heroState} />
      </MemoryRouter>
    </DesignSystemCopyProvider>,
  );
}

function expectBothButtons(): void {
  expect(screen.getByRole('link', { name: 'Schade melden' }).getAttribute('href')).toBe('/schade');
  expect(screen.getByRole('link', { name: 'Bekijk mijn polissen' }).getAttribute('href')).toBe('/polissen');
}

afterEach(cleanup);

describe('HeroCard', () => {
  it('shows one h1 with the greeting and the lead when loaded', () => {
    renderHero(LOADED_HERO);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Goedemiddag, Alex' })).toBeDefined();
    expect(screen.getByText('Je hebt 3 lopende verzekeringen en 1 openstaande schademelding.')).toBeDefined();
    expectBothButtons();
  });

  it('is busy with skeletons and has no h1 while loading', () => {
    const { container } = render(
      <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
        <MemoryRouter>
          <HeroCard dayPart="afternoon" onRetry={() => undefined} heroState={{ status: 'loading' }} />
        </MemoryRouter>
      </DesignSystemCopyProvider>,
    );

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expectBothButtons();
  });

  it('shows the hero banner in place of heading and lead and retries once when failed', async () => {
    const onRetry = mock(() => undefined);
    renderHero({ status: 'failed' }, onRetry);

    const banner = screen.getByRole('alert');
    expect(within(banner).getByText('We konden je overzicht niet laden.')).toBeDefined();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    await userEvent.click(within(banner).getByRole('button', { name: 'Opnieuw proberen' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expectBothButtons();
  });
});
