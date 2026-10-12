import { ApiErrorResponse }  from '../../adapters/http/ApiErrorResponse';
import { PolicyWireUtil }    from '../../adapters/http/PolicyWireUtil';
import { foundValueOf }      from '../../adapters/store/IngestionVerdict';
import { CustomerIngestion } from '../../adapters/store/customer/CustomerIngestion';
import { PolicyIngestion }   from '../../adapters/store/policies/PolicyIngestion';
import { singlePagePdfFor }  from '../../lib/pdf/SinglePagePdf';
import type { ApiContext }   from '../../services/ApiContext';
import { PortalError }       from '../../shared/errors/PortalError';

import { policySheetDocumentFor } from './policySheetDocument';

function policyNotFound(policyId: string): Response {
  return ApiErrorResponse.responseFor('notFound', `No policy with id ${policyId}.`);
}

export function createPolicyHandlers(context: ApiContext) {
  return {
    readPolicies(): Response {
      const policies = context.store.read((connection) => foundValueOf(new PolicyIngestion(connection).readPolicies(), 'policies')) ?? [];
      return Response.json(PolicyWireUtil.policyListWireFor(policies));
    },

    readPolicy(policyId: string): Response {
      const policy = context.store.read((connection) => foundValueOf(new PolicyIngestion(connection).readPolicy(policyId), 'policy'));
      return policy === undefined ? policyNotFound(policyId) : Response.json(PolicyWireUtil.policyDetailWireFor(policy));
    },

    readPolicySheet(policyId: string): Response {
      const sheet = context.store.read((connection) => {
        const policy = foundValueOf(new PolicyIngestion(connection).readPolicy(policyId), 'policy');
        if (policy === undefined) {
          return undefined;
        }
        const profile = foundValueOf(new CustomerIngestion(connection).readProfile(), 'profile');
        if (profile === undefined) {
          throw new PortalError('unrepaired', 'invalidStoredValue', 'The store holds no customer profile.');
        }
        return policySheetDocumentFor(policy, profile.fullName);
      });
      if (sheet === undefined) {
        return policyNotFound(policyId);
      }
      return new Response(singlePagePdfFor(sheet.lines), {
        headers: {
          'content-type':        'application/pdf',
          'content-disposition': `attachment; filename="${sheet.fileName}"`,
        },
      });
    },
  };
}
