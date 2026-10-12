import type { RouteTable } from '../../lib/route-table/composeRouteTables';
import type { ApiContext } from '../../services/ApiContext';

import { createProfileHandlers } from './profileHandlers';

export function createProfileRoutes(context: ApiContext): RouteTable {
  const handlers = createProfileHandlers(context);
  return {
    '/api/profile':                 { GET: () => handlers.readProfile() },
    '/api/profile/contact-details': { PUT: (request) => handlers.saveContactDetails(request) },
    '/api/profile/payment-details': { PUT: (request) => handlers.savePaymentDetails(request) },
  };
}
