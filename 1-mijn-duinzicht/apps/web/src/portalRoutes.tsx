import type { RouteObject } from 'react-router';

import { ClaimsPage }             from './features/claims/ClaimsPage';
import { MessagesPage }           from './features/messages/MessagesPage';
import { OverviewPage }           from './features/overview/OverviewPage';
import { PoliciesPage }           from './features/policies/PoliciesPage';
import { ProfilePage }            from './features/profile/ProfilePage';
import { NotFoundPage }           from './features/shell/NotFoundPage';
import { PortalLayout }           from './features/shell/PortalLayout';
import type { PortalRouteHandle } from './features/shell/PortalRouteHandle';

function handleFor(handle: PortalRouteHandle): PortalRouteHandle {
  return handle;
}

/** The route table of the portal: every page renders inside the shell's layout, and any other address is not found. */
export const PORTAL_ROUTES: RouteObject[] = [
  {
    Component: PortalLayout,
    children:  [
      {
        path: '/', caseSensitive: true, Component: OverviewPage, handle: handleFor({ section: 'overview' })
      },
      {
        path: '/polissen', caseSensitive: true, Component: PoliciesPage, handle: handleFor({ section: 'policies' })
      },
      {
        path: '/schade', caseSensitive: true, Component: ClaimsPage, handle: handleFor({ section: 'claims' })
      },
      {
        path: '/profiel', caseSensitive: true, Component: ProfilePage, handle: handleFor({ section: 'profile' })
      },
      {
        path: '/berichten', caseSensitive: true, Component: MessagesPage, handle: handleFor({ section: 'messages' })
      },
      { path: '*', Component: NotFoundPage, handle: handleFor({ section: 'notFound' }) },
    ],
  },
];
