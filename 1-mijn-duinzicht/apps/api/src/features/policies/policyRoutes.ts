import type { RouteTable } from '../../lib/route-table/composeRouteTables';
import type { ApiContext } from '../../services/ApiContext';

import { createPolicyHandlers } from './policyHandlers';

export function createPolicyRoutes(context: ApiContext): RouteTable {
  const handlers = createPolicyHandlers(context);
  return {
    '/api/policies':                        { GET: () => handlers.readPolicies() },
    '/api/policies/:policyId':              { GET: (request) => handlers.readPolicy(request.params['policyId'] ?? '') },
    '/api/policies/:policyId/policy-sheet': { GET: (request) => handlers.readPolicySheet(request.params['policyId'] ?? '') },
  };
}
