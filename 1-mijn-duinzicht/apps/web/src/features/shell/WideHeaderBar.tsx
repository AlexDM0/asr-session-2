import type { ResourceState } from '../../lib/resource/useResource';
import type { Profile }       from '../../shared/model/Profile';
import type { PortalSection } from '../../shared/sections/PortalPath';

import { AvatarBlock }       from './AvatarBlock';
import { PrimaryNavigation } from './PrimaryNavigation';
import { UtilityLinks }      from './UtilityLinks';
import styles                from './WideHeaderBar.module.css';
import { Wordmark }          from './Wordmark';

export interface WideHeaderBarProps {
  readonly activeSection:  PortalSection;
  readonly profileState:   ResourceState<Profile>;
  readonly onProfileRetry: () => void;
}

/** The header for 900px and wider: the grey utility bar above the main bar. */
export function WideHeaderBar({ activeSection, profileState, onProfileRetry }: WideHeaderBarProps) {
  return (
    <div className={styles['wideHeaderBar']}>
      <div className={styles['utilityBar']}>
        <div className={styles['utilityRow']}>
          <UtilityLinks />
        </div>
      </div>
      <div className={styles['mainRow']}>
        <Wordmark />
        <span aria-hidden="true" className={styles['spacer']} />
        <PrimaryNavigation activeSection={activeSection} />
        <span aria-hidden="true" className={styles['spacer']} />
        <AvatarBlock onRetry={onProfileRetry} profileState={profileState} />
      </div>
    </div>
  );
}
