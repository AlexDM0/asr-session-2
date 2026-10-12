import { OpenActionWireUtil } from '../../adapters/http/OpenActionWireUtil';
import { foundValueOf }       from '../../adapters/store/IngestionVerdict';
import { ClaimIngestion }     from '../../adapters/store/claims/ClaimIngestion';
import { CustomerIngestion }  from '../../adapters/store/customer/CustomerIngestion';
import type { ApiContext }    from '../../services/ApiContext';
import { PortalError }        from '../../shared/errors/PortalError';

import { OpenActionUtil } from './OpenActionUtil';

export function createOpenActionHandlers(context: ApiContext) {
  return {
    /** Derived on every read from the profile and the claims, never stored. */
    readOpenActions(): Response {
      const openActions = context.store.read((connection) => {
        const profile = foundValueOf(new CustomerIngestion(connection).readProfile(), 'profile');
        if (profile === undefined) {
          throw new PortalError('unrepaired', 'invalidStoredValue', 'The store holds no customer profile.');
        }
        const claims = foundValueOf(new ClaimIngestion(connection).readClaims(), 'claims') ?? [];
        return OpenActionUtil.openActionsFor(profile, claims);
      });
      return Response.json(OpenActionWireUtil.openActionListWireFor(openActions));
    },
  };
}
