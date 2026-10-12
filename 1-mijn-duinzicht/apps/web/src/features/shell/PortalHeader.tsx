import { useId, useRef } from 'react';

import { loadProfile }   from '../../adapters/ProfileAdapter';
import { useLayoutMode } from '../../lib/layout-mode/LayoutMode';
import { useResource }   from '../../lib/resource/useResource';

import { CompactHeaderBar }         from './CompactHeaderBar';
import { CompactMenuPanel }         from './CompactMenuPanel';
import styles                       from './PortalHeader.module.css';
import { useLeafPortalRoute }       from './PortalRouteHandle';
import { WideHeaderBar }            from './WideHeaderBar';
import { useCompactMenuDisclosure } from './useCompactMenuDisclosure';

const PROFILE_RESOURCE_KEY = 'profile';

/**
 * The banner of every page: the wide bar from the breakpoint up, the compact bar and its menu panel below it. It reads
 * the profile once per page load, because it stays mounted while the pages and the layout mode change.
 */
export function PortalHeader() {
  const { section } = useLeafPortalRoute();
  const profile = useResource(loadProfile, PROFILE_RESOURCE_KEY);
  const layoutMode = useLayoutMode();
  const headerReference = useRef<HTMLElement>(null);
  const menuButtonReference = useRef<HTMLButtonElement>(null);
  const menuPanelId = useId();
  const { menuIsOpen, toggleMenu } = useCompactMenuDisclosure({ layoutMode, headerReference, menuButtonReference });

  if (layoutMode === 'wide') {
    return (
      <header className={styles['portalHeader']} ref={headerReference}>
        <WideHeaderBar activeSection={section} onProfileRetry={profile.retry} profileState={profile.state} />
      </header>
    );
  }
  return (
    <header className={styles['portalHeader']} ref={headerReference}>
      <CompactHeaderBar menuButtonReference={menuButtonReference} menuIsOpen={menuIsOpen} menuPanelId={menuPanelId} onMenuToggle={toggleMenu} />
      {menuIsOpen && <CompactMenuPanel activeSection={section} id={menuPanelId} onProfileRetry={profile.retry} profileState={profile.state} />}
    </header>
  );
}
