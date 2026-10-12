import { PORTAL_SECTION_COPY } from '../../shared/copy/portalSectionCopy';
import { PlaceholderPage }     from '../../shared/placeholder/PlaceholderPage';
import { PortalPath }          from '../../shared/sections/PortalPath';

import { PROFILE_COPY } from './profileCopy';

const BREADCRUMB_ITEMS = [
  { label: PORTAL_SECTION_COPY.sectionLabels.overview, to: PortalPath.overview() },
  { label: PORTAL_SECTION_COPY.sectionLabels.profile },
];

export function ProfilePage() {
  return <PlaceholderPage breadcrumbItems={BREADCRUMB_ITEMS} heading={PROFILE_COPY.heading} />;
}
