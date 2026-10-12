import { PORTAL_SECTION_COPY } from '../../shared/copy/portalSectionCopy';
import { PlaceholderPage }     from '../../shared/placeholder/PlaceholderPage';
import { PortalPath }          from '../../shared/sections/PortalPath';

import { CLAIMS_COPY } from './claimsCopy';

const BREADCRUMB_ITEMS = [
  { label: PORTAL_SECTION_COPY.sectionLabels.overview, to: PortalPath.overview() },
  { label: PORTAL_SECTION_COPY.sectionLabels.claims },
];

export function ClaimsPage() {
  return <PlaceholderPage breadcrumbItems={BREADCRUMB_ITEMS} heading={CLAIMS_COPY.heading} />;
}
