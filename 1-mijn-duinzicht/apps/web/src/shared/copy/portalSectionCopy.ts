import type { PortalSection } from '../sections/PortalPath';

type NavigableSection = Exclude<PortalSection, 'notFound'>;

/** The Dutch section names that the shell navigation and the section breadcrumbs share. */
export const PORTAL_SECTION_COPY = {
  sectionLabels: {
    overview: 'Overzicht',
    policies: 'Polissen',
    claims:   'Schade',
    messages: 'Berichten',
    profile:  'Profiel',
  } satisfies Readonly<Record<NavigableSection, string>>,
} as const;
