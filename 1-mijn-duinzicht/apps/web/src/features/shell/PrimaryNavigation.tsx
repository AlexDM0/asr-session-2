import { Link } from 'react-router';

import { PORTAL_SECTION_COPY }            from '../../shared/copy/portalSectionCopy';
import { PortalPath, type PortalSection } from '../../shared/sections/PortalPath';

import styles         from './PrimaryNavigation.module.css';
import { SHELL_COPY } from './shellCopy';

export type PrimaryNavigationLayout = 'bar' | 'panel';

export interface PrimaryNavigationProps {
  /** Marks the item of this section; `notFound` marks none. */
  readonly activeSection: PortalSection;
  readonly layout?:       PrimaryNavigationLayout;
}

const NAVIGATION_ITEMS = [
  { section: 'overview', label: PORTAL_SECTION_COPY.sectionLabels.overview, to: PortalPath.overview() },
  { section: 'policies', label: PORTAL_SECTION_COPY.sectionLabels.policies, to: PortalPath.policies() },
  { section: 'claims', label: PORTAL_SECTION_COPY.sectionLabels.claims, to: PortalPath.claims() },
  { section: 'messages', label: PORTAL_SECTION_COPY.sectionLabels.messages, to: PortalPath.messages() },
  { section: 'profile', label: PORTAL_SECTION_COPY.sectionLabels.profile, to: PortalPath.profile() },
] as const;

export function PrimaryNavigation({ activeSection, layout = 'bar' }: PrimaryNavigationProps) {
  return (
    <nav aria-label={SHELL_COPY.primaryNavigationName} className={styles['primaryNavigation']} data-layout={layout}>
      {NAVIGATION_ITEMS.map((item) => (
        <Link aria-current={item.section === activeSection ? 'page' : undefined} className={styles['item']} key={item.section} to={item.to}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
