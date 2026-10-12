import type { RouteTable } from '../../lib/route-table/composeRouteTables';
import type { ApiContext } from '../../services/ApiContext';

import { createOpenActionHandlers } from './openActionHandlers';

export function createOpenActionRoutes(context: ApiContext): RouteTable {
  const handlers = createOpenActionHandlers(context);
  return { '/api/open-actions': { GET: () => handlers.readOpenActions() }, };
}
