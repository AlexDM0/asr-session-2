import type { RouteTable } from '../../lib/route-table/composeRouteTables';
import type { ApiContext } from '../../services/ApiContext';

import { createMessageHandlers } from './messageHandlers';

export function createMessageRoutes(context: ApiContext): RouteTable {
  const handlers = createMessageHandlers(context);
  return {
    '/api/messages':                 { GET: () => handlers.readMessages() },
    '/api/messages/:messageId':      { GET: (request) => handlers.readMessage(request.params['messageId'] ?? '') },
    '/api/messages/:messageId/read': { PUT: (request) => handlers.markMessageRead(request.params['messageId'] ?? '') },
  };
}
