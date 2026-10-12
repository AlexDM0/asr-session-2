import { NextPaymentWireUtil } from '../../adapters/http/NextPaymentWireUtil';
import { foundValueOf }        from '../../adapters/store/IngestionVerdict';
import { CustomerIngestion }   from '../../adapters/store/customer/CustomerIngestion';
import { PolicyIngestion }     from '../../adapters/store/policies/PolicyIngestion';
import type { ApiContext }     from '../../services/ApiContext';
import { PortalError }         from '../../shared/errors/PortalError';

import { NextPaymentUtil } from './NextPaymentUtil';

export function createPaymentHandlers(context: ApiContext) {
  return {
    readNextPayment(): Response {
      const nextPayment = context.store.read((connection) => {
        const customerIngestion = new CustomerIngestion(connection);
        const schedule = foundValueOf(customerIngestion.readDirectDebitSchedule(), 'direct-debit schedule') ?? null;
        const profile = foundValueOf(customerIngestion.readProfile(), 'profile');
        if (profile === undefined) {
          throw new PortalError('unrepaired', 'invalidStoredValue', 'The store holds no customer profile.');
        }
        const policies = foundValueOf(new PolicyIngestion(connection).readPolicies(), 'policies') ?? [];
        return NextPaymentUtil.nextPaymentFor(schedule, policies, profile.iban);
      });
      return Response.json(NextPaymentWireUtil.nextPaymentResultWireFor(nextPayment));
    },
  };
}
