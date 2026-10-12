import type { Database } from 'bun:sqlite';

import { ApiErrorResponse }          from '../../adapters/http/ApiErrorResponse';
import { jsonRequestBodyVerdictFor } from '../../adapters/http/JsonRequestBody';
import { ProfileWireUtil }           from '../../adapters/http/ProfileWireUtil';
import { foundValueOf }              from '../../adapters/store/IngestionVerdict';
import { CustomerIngestion }         from '../../adapters/store/customer/CustomerIngestion';
import { createCustomerWriter }      from '../../adapters/store/customer/CustomerWriter';
import type { ApiContext }           from '../../services/ApiContext';
import { PortalError }               from '../../shared/errors/PortalError';
import type { Profile }              from '../../shared/model/Profile';

const ONE_CUSTOMER_ROW = 1;

function storedProfileFrom(connection: Database): Profile {
  const profile = foundValueOf(new CustomerIngestion(connection).readProfile(), 'profile');
  if (profile === undefined) {
    throw new PortalError('unrepaired', 'invalidStoredValue', 'The store holds no customer profile.');
  }
  return profile;
}

/** Throwing rolls the write back, so a write whose stored result cannot be read back is never kept. */
function requireOneChangedCustomerRow(changedRowCount: number): void {
  if (changedRowCount !== ONE_CUSTOMER_ROW) {
    throw new PortalError('unrepaired', 'invalidStoredValue', `The write changed ${changedRowCount} customer rows instead of one.`);
  }
}

export function createProfileHandlers(context: ApiContext) {
  return {
    readProfile(): Response {
      return Response.json(ProfileWireUtil.profileWireFor(context.store.read(storedProfileFrom)));
    },

    async saveContactDetails(request: Request): Promise<Response> {
      const bodyVerdict = await jsonRequestBodyVerdictFor(request);
      if (bodyVerdict.outcome === 'malformed') {
        return ApiErrorResponse.responseFor('malformedRequest', 'The request body must be a JSON object sent as application/json.');
      }
      const updateVerdict = ProfileWireUtil.contactDetailsUpdateVerdictFor(bodyVerdict.body);
      if (updateVerdict.outcome === 'invalid') {
        return ApiErrorResponse.responseFor('validationFailed', 'The contact details are invalid.', updateVerdict.fieldErrors);
      }
      const storedProfile = context.store.write((connection) => {
        storedProfileFrom(connection);
        requireOneChangedCustomerRow(createCustomerWriter(connection).updateContactDetails(updateVerdict.update));
        return storedProfileFrom(connection);
      });
      return Response.json(ProfileWireUtil.profileWireFor(storedProfile));
    },

    async savePaymentDetails(request: Request): Promise<Response> {
      const bodyVerdict = await jsonRequestBodyVerdictFor(request);
      if (bodyVerdict.outcome === 'malformed') {
        return ApiErrorResponse.responseFor('malformedRequest', 'The request body must be a JSON object sent as application/json.');
      }
      const updateVerdict = ProfileWireUtil.paymentDetailsUpdateVerdictFor(bodyVerdict.body);
      if (updateVerdict.outcome === 'invalid') {
        return ApiErrorResponse.responseFor('validationFailed', 'The payment details are invalid.', updateVerdict.fieldErrors);
      }
      const storedProfile = context.store.write((connection) => {
        storedProfileFrom(connection);
        requireOneChangedCustomerRow(createCustomerWriter(connection).updatePaymentDetails(updateVerdict.update));
        return storedProfileFrom(connection);
      });
      return Response.json(ProfileWireUtil.profileWireFor(storedProfile));
    },
  };
}
