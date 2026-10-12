import { loadClaims }         from '../../adapters/ClaimAdapter';
import { loadPolicies }       from '../../adapters/PolicyAdapter';
import { loadProfile }        from '../../adapters/ProfileAdapter';
import type { ReadVerdict }   from '../../lib/resource/ReadVerdict';
import type { ClaimSummary }  from '../../shared/model/Claim';
import type { PolicySummary } from '../../shared/model/Policy';
import type { Profile }       from '../../shared/model/Profile';

export interface HeroSourceValues {
  readonly profile:  Profile;
  readonly policies: readonly PolicySummary[];
  readonly claims:   readonly ClaimSummary[];
}

export type HeroSourceLoaders = {
  readonly [Source in keyof HeroSourceValues]: (signal: AbortSignal) => Promise<ReadVerdict<HeroSourceValues[Source]>>;
};

/** The hero's three reads, bound to the adapters; specs inject their own loaders instead. */
export const HERO_SOURCE_LOADERS: HeroSourceLoaders = Object.freeze({
  profile:  loadProfile,
  policies: loadPolicies,
  claims:   loadClaims,
});
