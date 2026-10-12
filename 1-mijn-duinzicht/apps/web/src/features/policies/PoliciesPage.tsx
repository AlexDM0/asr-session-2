import { PORTAL_SECTION_COPY } from '../../shared/copy/portalSectionCopy';
import { PlaceholderPage }     from '../../shared/placeholder/PlaceholderPage';
import { PortalPath }          from '../../shared/sections/PortalPath';

import { POLICIES_COPY } from './policiesCopy';

const BREADCRUMB_ITEMS = [
  { label: PORTAL_SECTION_COPY.sectionLabels.overview, to: PortalPath.overview() },
  { label: PORTAL_SECTION_COPY.sectionLabels.policies },
];

export function PoliciesPage() {
  return <PlaceholderPage breadcrumbItems={BREADCRUMB_ITEMS} heading={POLICIES_COPY.heading} />;
}
