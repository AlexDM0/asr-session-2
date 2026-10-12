import type { ResourceState } from '../../lib/resource/useResource';
import type { Profile }       from '../../shared/model/Profile';
import type { PortalSection } from '../../shared/sections/PortalPath';

import { AvatarBlock }       from './AvatarBlock';
import styles                from './CompactMenuPanel.module.css';
import { PrimaryNavigation } from './PrimaryNavigation';
import { UtilityLinks }      from './UtilityLinks';

export interface CompactMenuPanelProps {
  readonly id:             string;
  readonly activeSection:  PortalSection;
  readonly profileState:   ResourceState<Profile>;
  readonly onProfileRetry: () => void;
}

/** Every destination of the wide header for screens below the breakpoint, overlaying the page under the compact bar. */
export function CompactMenuPanel({
  id,
  activeSection,
  profileState,
  onProfileRetry,
}: CompactMenuPanelProps) {
  return (
    <div className={styles['compactMenuPanel']} id={id}>
      <div className={styles['avatarRow']}>
        <AvatarBlock onRetry={onProfileRetry} profileState={profileState} />
      </div>
      <PrimaryNavigation activeSection={activeSection} layout="panel" />
      <UtilityLinks layout="panel" />
    </div>
  );
}
