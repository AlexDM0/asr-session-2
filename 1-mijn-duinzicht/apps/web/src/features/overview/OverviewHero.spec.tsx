/**
 * The hero wires three sources into one card, so its claims are integration claims over fixture
 * loaders: the greeting and lead from the shared sources, the greeting decided once per mount, and a
 * retry that reloads only the sources that failed.
 */
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent  from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it,
  setSystemTime
} from 'bun:test';
import { MemoryRouter } from 'react-router';

import { DesignSystemCopyProvider }  from '../../lib/design-system/DesignSystemCopy';
import { PORTAL_DESIGN_SYSTEM_COPY } from '../../shared/copy/portalDesignSystemCopy';

import { OverviewHero } from './OverviewHero';
import {
  controllableHeroSources,
  EXAMPLE_FAILURE,
  EXAMPLE_PROFILE,
  foundAnswer,
  foundAnswerScripts
} from './heroSourceFixtures.mock';
import type { HeroSourceLoaders } from './heroSourceLoaders';

function renderHero(sourceLoaders: HeroSourceLoaders): { readonly container: HTMLElement } {
  return render(
    <DesignSystemCopyProvider copy={PORTAL_DESIGN_SYSTEM_COPY}>
      <MemoryRouter>
        <OverviewHero sourceLoaders={sourceLoaders} />
      </MemoryRouter>
    </DesignSystemCopyProvider>,
  );
}

afterEach(() => {
  cleanup();
  setSystemTime();
});

describe('OverviewHero', () => {
  it('greets by the afternoon and counts only active policies and open claims', async () => {
    setSystemTime(new Date(2099, 0, 1, 14, 30));
    const { sourceLoaders } = controllableHeroSources(foundAnswerScripts());
    renderHero(sourceLoaders);

    expect(await screen.findByRole('heading', { level: 1, name: 'Goedemiddag, Alex' })).toBeDefined();
    expect(screen.getByText('Je hebt 3 lopende verzekeringen en 2 openstaande schademeldingen.')).toBeDefined();
  });

  it('is busy while any source loads and keeps both buttons', () => {
    const { sourceLoaders } = controllableHeroSources({ profile: foundAnswerScripts().profile ?? [] });
    const { container } = renderHero(sourceLoaders);

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Schade melden' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Bekijk mijn polissen' })).toBeDefined();
  });

  it('decides the greeting once per mount, so a later retry past 18:00 keeps it', async () => {
    setSystemTime(new Date(2099, 0, 1, 17, 59));
    const { sources, sourceLoaders } = controllableHeroSources({ ...foundAnswerScripts(), profile: [EXAMPLE_FAILURE] });
    renderHero(sourceLoaders);
    const retryButton = await screen.findByRole('button', { name: 'Opnieuw proberen' });

    setSystemTime(new Date(2099, 0, 1, 18, 30));
    act(() => retryButton.click());
    act(() => sources.profile.answerPending(foundAnswer(EXAMPLE_PROFILE)));

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Goedemiddag, Alex' })).toBeDefined());
  });

  it('shows one banner when claims fail, and its retry reloads only the claims', async () => {
    const { sources, sourceLoaders } = controllableHeroSources({ ...foundAnswerScripts(), claims: [EXAMPLE_FAILURE] });
    renderHero(sourceLoaders);

    const banner = await screen.findByRole('alert');
    expect(within(banner).getByText('We konden je overzicht niet laden.')).toBeDefined();
    await userEvent.click(within(banner).getByRole('button', { name: 'Opnieuw proberen' }));

    expect(sources.claims.callCount()).toBe(2);
    expect(sources.profile.callCount()).toBe(1);
    expect(sources.policies.callCount()).toBe(1);
  });

  it('shows the banner again when a retried source fails again', async () => {
    const { sources, sourceLoaders } = controllableHeroSources({ ...foundAnswerScripts(), policies: [EXAMPLE_FAILURE, EXAMPLE_FAILURE] });
    renderHero(sourceLoaders);
    await userEvent.click(await screen.findByRole('button', { name: 'Opnieuw proberen' }));

    expect(await screen.findByText('We konden je overzicht niet laden.')).toBeDefined();
    expect(sources.policies.callCount()).toBe(2);
  });
});
