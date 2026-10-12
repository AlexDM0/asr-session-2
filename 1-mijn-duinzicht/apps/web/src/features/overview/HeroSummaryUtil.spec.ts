/**
 * The util is the whole failure model of the hero, so every rule is pinned: the summary counts only
 * active policies and open claims, loading wins over failed, notFound counts as failed, and a retry
 * set never holds a loaded source.
 */
import { describe, expect, it } from 'bun:test';

import type { ResourceState } from '../../lib/resource/useResource';

import { HeroSummaryUtil, type HeroSourceStates } from './HeroSummaryUtil';
import { EXAMPLE_SOURCE_VALUES, exampleClaim }    from './heroSourceFixtures.mock';

const LOADING = { status: 'loading' } as const;
const FAILED = { status: 'failed' } as const;
const NOT_FOUND = { status: 'notFound' } as const;

function loaded<Value>(value: Value): ResourceState<Value> {
  return { status: 'loaded', value };
}

const ALL_LOADED: HeroSourceStates = {
  profile:  loaded(EXAMPLE_SOURCE_VALUES.profile),
  policies: loaded(EXAMPLE_SOURCE_VALUES.policies),
  claims:   loaded(EXAMPLE_SOURCE_VALUES.claims),
};

describe('HeroSummaryUtil.heroStateFor', () => {
  it('loads the first name with the counts of active policies and open claims, never ended policies or closed claims', () => {
    expect(HeroSummaryUtil.heroStateFor(ALL_LOADED)).toEqual({
      status: 'loaded',
      value:  { firstName: 'Alex', activePolicyCount: 3, openClaimCount: 2 },
    });
  });

  it('counts reported and in-progress claims as open', () => {
    const claims = [exampleClaim('EX-REPORTED', { status: 'reported' }), exampleClaim('EX-IN-PROGRESS', { status: 'inProgress' })];
    const heroState = HeroSummaryUtil.heroStateFor({ ...ALL_LOADED, claims: loaded(claims) });

    expect(heroState.status === 'loaded' ? heroState.value.openClaimCount : null).toBe(2);
  });

  it('shows loading while any source still loads, even when another has failed', () => {
    expect(HeroSummaryUtil.heroStateFor({ ...ALL_LOADED, profile: LOADING, policies: FAILED }).status).toBe('loading');
  });

  it('fails when any source fails, and counts notFound as failed', () => {
    expect(HeroSummaryUtil.heroStateFor({ ...ALL_LOADED, claims: FAILED }).status).toBe('failed');
    expect(HeroSummaryUtil.heroStateFor({ ...ALL_LOADED, profile: NOT_FOUND }).status).toBe('failed');
  });
});

describe('HeroSummaryUtil.sourcesToRetryFor', () => {
  it('retries exactly the failed and notFound sources, never a loaded one', () => {
    expect(HeroSummaryUtil.sourcesToRetryFor({ ...ALL_LOADED, policies: FAILED, claims: NOT_FOUND })).toEqual(['policies', 'claims']);
    expect(HeroSummaryUtil.sourcesToRetryFor(ALL_LOADED)).toEqual([]);
  });
});
