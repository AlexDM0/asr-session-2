import type { RouteTable } from '../../lib/route-table/composeRouteTables';
import type { ApiContext } from '../../services/ApiContext';

import { createClaimHandlers }      from './claimHandlers';
import { createClaimWriteHandlers } from './claimWriteHandlers';

export function createClaimRoutes(context: ApiContext): RouteTable {
  const handlers = createClaimHandlers(context);
  const writeHandlers = createClaimWriteHandlers(context);
  return {
    '/api/claims':                 { GET: () => handlers.readClaims(), POST: (request) => writeHandlers.reportClaim(request) },
    '/api/claims/:claimId':        { GET: (request) => handlers.readClaim(request.params['claimId'] ?? '') },
    '/api/claims/:claimId/photos': { POST: (request) => writeHandlers.receiveClaimPhotos(request.params['claimId'] ?? '', request) },
  };
}
