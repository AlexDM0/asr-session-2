import { ButtonLink }    from '../../lib/design-system/ButtonLink';
import { ContentCard }   from '../../lib/design-system/ContentCard';
import { ErrorBanner }   from '../../lib/design-system/ErrorBanner';
import { LoadingRegion } from '../../lib/design-system/LoadingRegion';
import { SkeletonBlock } from '../../lib/design-system/SkeletonBlock';
import { useLayoutMode } from '../../lib/layout-mode/LayoutMode';
import { PortalPath }    from '../../shared/sections/PortalPath';

import styles             from './HeroCard.module.css';
import type { HeroState } from './HeroSummaryUtil';
import type { DayPart }   from './overviewCopy';

import { OVERVIEW_COPY } from './overviewCopy';

export interface HeroCardProps {
  readonly dayPart:   DayPart;
  readonly heroState: HeroState;
  readonly onRetry:   () => void;
}

function HeroText({ dayPart, heroState, onRetry }: HeroCardProps) {
  switch (heroState.status) {
    case 'loading':
      return (
        <LoadingRegion>
          <div className={styles['skeleton']}>
            <SkeletonBlock height="var(--font-size-display)" width="70%" />
            <div className={styles['leadSkeleton']}>
              <SkeletonBlock height="var(--font-size-lead)" width="100%" />
              <SkeletonBlock height="var(--font-size-lead)" width="60%" />
            </div>
          </div>
        </LoadingRegion>
      );
    case 'failed':
      return <ErrorBanner message={OVERVIEW_COPY.heroError} onRetry={onRetry} />;
    case 'loaded':
      return (
        <>
          <h1 className={styles['heading']}>{OVERVIEW_COPY.greetingHeading(dayPart, heroState.value.firstName)}</h1>
          <p className={styles['lead']}>{OVERVIEW_COPY.leadSentence(heroState.value.activePolicyCount, heroState.value.openClaimCount)}</p>
        </>
      );
  }
}

export function HeroCard(props: HeroCardProps) {
  const cardPadding = useLayoutMode() === 'compact' ? 'space24' : 'space40';
  return (
    <ContentCard elevation="raised" padding={cardPadding}>
      <div className={styles['heroCard']}>
        <HeroText {...props} />
        <div className={styles['buttons']}>
          <ButtonLink to={PortalPath.claims()} variant="primary">{OVERVIEW_COPY.reportClaimAction}</ButtonLink>
          <ButtonLink to={PortalPath.policies()} variant="secondary">{OVERVIEW_COPY.viewPoliciesAction}</ButtonLink>
        </div>
      </div>
    </ContentCard>
  );
}
