import type { Database } from 'bun:sqlite';

import { ApiErrorResponse }          from '../../adapters/http/ApiErrorResponse';
import { jsonRequestBodyVerdictFor } from '../../adapters/http/JsonRequestBody';
import { PreferencesWireUtil }       from '../../adapters/http/PreferencesWireUtil';
import { foundValueOf }              from '../../adapters/store/IngestionVerdict';
import { CustomerIngestion }         from '../../adapters/store/customer/CustomerIngestion';
import { createCustomerWriter }      from '../../adapters/store/customer/CustomerWriter';
import type { ApiContext }           from '../../services/ApiContext';
import { PortalError }               from '../../shared/errors/PortalError';
import type { Preferences }          from '../../shared/model/Preferences';

const ONE_PREFERENCES_ROW = 1;

function storedPreferencesFrom(connection: Database): Preferences {
  const preferences = foundValueOf(new CustomerIngestion(connection).readPreferences(), 'preferences');
  if (preferences === undefined) {
    throw new PortalError('unrepaired', 'invalidStoredValue', 'The store holds no preferences.');
  }
  return preferences;
}

export function createPreferencesHandlers(context: ApiContext) {
  return {
    readPreferences(): Response {
      return Response.json(PreferencesWireUtil.preferencesWireFor(context.store.read(storedPreferencesFrom)));
    },

    async savePreferences(request: Request): Promise<Response> {
      const bodyVerdict = await jsonRequestBodyVerdictFor(request);
      if (bodyVerdict.outcome === 'malformed') {
        return ApiErrorResponse.responseFor('malformedRequest', 'The request body must be a JSON object sent as application/json.');
      }
      const updateVerdict = PreferencesWireUtil.preferencesUpdateVerdictFor(bodyVerdict.body);
      if (updateVerdict.outcome === 'invalid') {
        return ApiErrorResponse.responseFor('validationFailed', 'The preferences are invalid.', updateVerdict.fieldErrors);
      }
      const storedPreferences = context.store.write((connection) => {
        storedPreferencesFrom(connection);
        const changedRowCount = createCustomerWriter(connection).updatePreferences(updateVerdict.update);
        if (changedRowCount !== ONE_PREFERENCES_ROW) {
          throw new PortalError('unrepaired', 'invalidStoredValue', `The write changed ${changedRowCount} preferences rows instead of one.`);
        }
        return storedPreferencesFrom(connection);
      });
      return Response.json(PreferencesWireUtil.preferencesWireFor(storedPreferences));
    },
  };
}
