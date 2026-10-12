import { useMatches, type UIMatch } from 'react-router';

import type { PortalSection } from '../../shared/sections/PortalPath';

/** What a route of `PORTAL_ROUTES` tells the shell: the section it belongs to. */
export interface PortalRouteHandle {
  readonly section: PortalSection;
}

export interface LeafPortalRoute {
  readonly section: PortalSection;
}

const PORTAL_SECTIONS: readonly PortalSection[] = ['overview', 'policies', 'claims', 'profile', 'messages', 'notFound'];

function isPortalSection(candidate: unknown): candidate is PortalSection {
  return PORTAL_SECTIONS.some((section) => section === candidate);
}

/** A route without a recognisable handle counts as not found, so no navigation item is ever marked by guesswork. */
export function leafPortalRouteOf(matches: readonly UIMatch[]): LeafPortalRoute {
  const handle: unknown = matches.at(-1)?.handle;
  const section: unknown = typeof handle === 'object' && handle !== null ? Reflect.get(handle, 'section') : undefined;
  return { section: isPortalSection(section) ? section : 'notFound' };
}

export function useLeafPortalRoute(): LeafPortalRoute {
  return leafPortalRouteOf(useMatches());
}
