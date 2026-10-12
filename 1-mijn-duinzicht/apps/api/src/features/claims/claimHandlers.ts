import { ApiErrorResponse }                        from '../../adapters/http/ApiErrorResponse';
import { type ClaimWithPolicyName, ClaimWireUtil } from '../../adapters/http/ClaimWireUtil';
import { foundValueOf }                            from '../../adapters/store/IngestionVerdict';
import { ClaimIngestion }                          from '../../adapters/store/claims/ClaimIngestion';
import { PolicyIngestion }                         from '../../adapters/store/policies/PolicyIngestion';
import type { ApiContext }                         from '../../services/ApiContext';
import { PortalError }                             from '../../shared/errors/PortalError';
import type { Claim }                              from '../../shared/model/Claim';
import type { Policy }                             from '../../shared/model/Policy';

import { ClaimOrderUtil } from './ClaimOrderUtil';

/** The policy name is looked up among all policies, ended ones included; a claim on a missing policy fails closed. */
export function withPolicyNames(claims: readonly Claim[], policies: readonly Policy[]): ClaimWithPolicyName[] {
  const policyNameById = new Map(policies.map((policy) => [policy.id, policy.name]));
  return claims.map((claim) => {
    const policyName = policyNameById.get(claim.policyId);
    if (policyName === undefined) {
      throw new PortalError('unrepaired', 'invalidStoredValue', `Claim ${claim.id} refers to the unknown policy ${claim.policyId}.`);
    }
    return { claim, policyName };
  });
}

export function createClaimHandlers(context: ApiContext) {
  return {
    readClaims(): Response {
      const claimsWithPolicyNames = context.store.read((connection) => {
        const claims = foundValueOf(new ClaimIngestion(connection).readClaims(), 'claims') ?? [];
        const policies = foundValueOf(new PolicyIngestion(connection).readPolicies(), 'policies') ?? [];
        return withPolicyNames(ClaimOrderUtil.inListOrder(claims), policies);
      });
      return Response.json(ClaimWireUtil.claimListWireFor(claimsWithPolicyNames));
    },

    readClaim(claimId: string): Response {
      const claimWithPolicyName = context.store.read((connection) => {
        const claim = foundValueOf(new ClaimIngestion(connection).readClaim(claimId), 'claim');
        if (claim === undefined) {
          return undefined;
        }
        const policies = foundValueOf(new PolicyIngestion(connection).readPolicies(), 'policies') ?? [];
        return withPolicyNames([claim], policies)[0];
      });
      if (claimWithPolicyName === undefined) {
        return ApiErrorResponse.responseFor('notFound', `No claim with id ${claimId}.`);
      }
      return Response.json(ClaimWireUtil.claimDetailWireFor(claimWithPolicyName));
    },
  };
}
