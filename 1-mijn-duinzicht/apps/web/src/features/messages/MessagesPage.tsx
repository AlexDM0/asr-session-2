import { PORTAL_SECTION_COPY } from '../../shared/copy/portalSectionCopy';
import { PlaceholderPage }     from '../../shared/placeholder/PlaceholderPage';
import { PortalPath }          from '../../shared/sections/PortalPath';

import { MESSAGES_COPY } from './messagesCopy';

const BREADCRUMB_ITEMS = [
  { label: PORTAL_SECTION_COPY.sectionLabels.overview, to: PortalPath.overview() },
  { label: PORTAL_SECTION_COPY.sectionLabels.messages },
];

export function MessagesPage() {
  return <PlaceholderPage breadcrumbItems={BREADCRUMB_ITEMS} heading={MESSAGES_COPY.heading} />;
}
