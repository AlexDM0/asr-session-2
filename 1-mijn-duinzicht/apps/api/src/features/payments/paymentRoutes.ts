import type { RouteTable } from '../../lib/route-table/composeRouteTables';
import type { ApiContext } from '../../services/ApiContext';

import { createPaymentHandlers } from './paymentHandlers';

export function createPaymentRoutes(context: ApiContext): RouteTable {
  const handlers = createPaymentHandlers(context);
  return { '/api/payments/next': { GET: () => handlers.readNextPayment() }, };
}
