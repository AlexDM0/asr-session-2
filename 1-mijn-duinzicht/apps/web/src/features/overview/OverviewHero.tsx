import { useState } from 'react';

import { ContentColumn } from '../../lib/design-system/ContentColumn';
import { TwoColumnGrid } from '../../lib/design-system/TwoColumnGrid';
import { useResource }   from '../../lib/resource/useResource';

import { GreetingUtil }           from './GreetingUtil';
import { HeroCard }               from './HeroCard';
import { HeroSummaryUtil }        from './HeroSummaryUtil';
import styles                     from './OverviewHero.module.css';
import type { HeroSourceLoaders } from './heroSourceLoaders';

/** On wide layouts the hero keeps the first column's share of the portal's hero row; the second column stays empty. */
const HERO_ROW_TEMPLATE = 'minmax(0, 1.4fr) minmax(0, 1fr)';

export interface OverviewHeroProps {
  readonly sourceLoaders: HeroSourceLoaders;
}

/** Loads the hero's sources and decides the greeting once per mount, so a retry later in the day keeps the greeting it started with. */
export function OverviewHero({ sourceLoaders }: OverviewHeroProps) {
  const profile = useResource(sourceLoaders.profile, 'profile');
  const policies = useResource(sourceLoaders.policies, 'policies');
  const claims = useResource(sourceLoaders.claims, 'claims');
  const [dayPart] = useState(() => GreetingUtil.dayPartFor(new Date()));
  const sourceStates = { profile: profile.state, policies: policies.state, claims: claims.state };
  const retries = { profile: profile.retry, policies: policies.retry, claims: claims.retry };
  const retryFailedSources = (): void => {
    for (const source of HeroSummaryUtil.sourcesToRetryFor(sourceStates)) {
      retries[source]();
    }
  };
  return (
    <div className={styles['overviewHero']}>
      <ContentColumn>
        <TwoColumnGrid gap="space24" template={HERO_ROW_TEMPLATE}>
          <HeroCard dayPart={dayPart} heroState={HeroSummaryUtil.heroStateFor(sourceStates)} onRetry={retryFailedSources} />
        </TwoColumnGrid>
      </ContentColumn>
    </div>
  );
}
