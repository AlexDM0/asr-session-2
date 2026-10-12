import type { ResourceState } from '../../lib/resource/useResource';
import type { ClaimSummary }  from '../../shared/model/Claim';

import type { HeroSourceValues } from './heroSourceLoaders';

export type HeroSource = keyof HeroSourceValues;

export interface HeroSummary {
  readonly firstName:         string;
  readonly activePolicyCount: number;
  readonly openClaimCount:    number;
}

export type HeroSourceStates = {
  readonly [Source in HeroSource]: ResourceState<HeroSourceValues[Source]>;
};

export type HeroState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | { readonly status: 'loaded'; readonly value: HeroSummary };

const HERO_SOURCES: readonly HeroSource[] = ['profile', 'policies', 'claims'];

function claimIsOpen(claim: ClaimSummary): boolean {
  return claim.status === 'reported' || claim.status === 'inProgress';
}

function sourceHasFailed(sourceStates: HeroSourceStates, source: HeroSource): boolean {
  const { status } = sourceStates[source];
  return status === 'failed' || status === 'notFound';
}

/** Combines the hero's three sources: loading wins over failed, so the hero never shows a banner or partial data mid-reload. */
export const HeroSummaryUtil = {
  heroStateFor: (sourceStates: HeroSourceStates): HeroState => {
    const { profile, policies, claims } = sourceStates;
    if (profile.status === 'loading' || policies.status === 'loading' || claims.status === 'loading') {
      return { status: 'loading' };
    }
    if (profile.status !== 'loaded' || policies.status !== 'loaded' || claims.status !== 'loaded') {
      return { status: 'failed' };
    }
    return {
      status: 'loaded',
      value:  {
        firstName:         profile.value.firstName,
        activePolicyCount: policies.value.filter((policy) => policy.status === 'active').length,
        openClaimCount:    claims.value.filter(claimIsOpen).length,
      },
    };
  },

  sourcesToRetryFor: (sourceStates: HeroSourceStates): readonly HeroSource[] =>
    HERO_SOURCES.filter((source) => sourceHasFailed(sourceStates, source)),
} as const;
