import { createClaimRoutes }       from './features/claims/claimRoutes';
import { createMessageRoutes }     from './features/messages/messageRoutes';
import { createOpenActionRoutes }  from './features/open-actions/openActionRoutes';
import { createPaymentRoutes }     from './features/payments/paymentRoutes';
import { createPolicyRoutes }      from './features/policies/policyRoutes';
import { createPreferencesRoutes } from './features/preferences/preferencesRoutes';
import { createProfileRoutes }     from './features/profile/profileRoutes';
import type { RouteTable }         from './lib/route-table/composeRouteTables';
import type { ApiContext }         from './services/ApiContext';

/** The composition file: every feature's route table; a new feature adds its table here. */
export function apiRouteTablesFor(context: ApiContext): readonly RouteTable[] {
  return [
    createProfileRoutes(context),
    createPreferencesRoutes(context),
    createPolicyRoutes(context),
    createClaimRoutes(context),
    createMessageRoutes(context),
    createPaymentRoutes(context),
    createOpenActionRoutes(context),
  ];
}
