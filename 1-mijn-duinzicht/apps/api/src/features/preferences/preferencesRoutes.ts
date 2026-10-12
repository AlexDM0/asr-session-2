import type { RouteTable } from '../../lib/route-table/composeRouteTables';
import type { ApiContext } from '../../services/ApiContext';

import { createPreferencesHandlers } from './preferencesHandlers';

export function createPreferencesRoutes(context: ApiContext): RouteTable {
  const handlers = createPreferencesHandlers(context);
  return {
    '/api/preferences': {
      GET:   () => handlers.readPreferences(),
      PATCH: (request) => handlers.savePreferences(request),
    },
  };
}
