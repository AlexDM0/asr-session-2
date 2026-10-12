import type { FieldErrorWire }                           from '@mijn-duinzicht/api-contract/ApiErrorWire';
import { CLAIM_POLICY_ELIGIBILITY, ClaimReportRuleUtil } from '@mijn-duinzicht/claim-report-rules/ClaimReportRuleUtil';

import type { ClaimCreationReadFields } from '../../adapters/http/ClaimWireUtil';
import type { Policy }                  from '../../shared/model/Policy';
import type { CalendarDate }            from '../../shared/model/Profile';

export type ClaimCreationVerdict =
  | { readonly outcome: 'acceptable' }
  | { readonly outcome: 'refused'; readonly fieldErrors: readonly FieldErrorWire[] };

export interface ClaimCreationCircumstances {
  readonly policies: readonly Policy[];
  /** Today's Europe/Amsterdam date, `YYYY-MM-DD`. */
  readonly today:    CalendarDate;
}

/**
 * Applies the shared claim-report rules; it has no rule of its own.
 * Fields absent from `creation` were refused while reading and are skipped; without a category the
 * policy cannot be judged.
 */
export const ClaimCreationVerdictUtil = Object.freeze({
  verdictFor(creation: ClaimCreationReadFields, { policies, today }: ClaimCreationCircumstances): ClaimCreationVerdict {
    const fieldErrors: FieldErrorWire[] = [];
    const {
      category, policyId, incidentDate, description 
    } = creation;
    if (category !== undefined && policyId !== undefined) {
      const eligibleKinds = CLAIM_POLICY_ELIGIBILITY[category];
      const policyIsEligible = policies.some((policy) => policy.id === policyId && policy.status === 'active' && eligibleKinds.includes(policy.kind));
      if (!policyIsEligible) {
        fieldErrors.push({ field: 'policyId', reason: 'notEligible' });
      }
    }
    if (incidentDate !== undefined) {
      const dateVerdict = ClaimReportRuleUtil.incidentDateVerdictFor(incidentDate, today);
      if (dateVerdict.outcome !== 'acceptable') {
        fieldErrors.push({ field: 'incidentDate', reason: dateVerdict.outcome });
      }
    }
    if (description !== undefined) {
      const descriptionVerdict = ClaimReportRuleUtil.descriptionVerdictFor(description);
      if (descriptionVerdict.outcome !== 'acceptable') {
        fieldErrors.push({ field: 'description', reason: descriptionVerdict.outcome });
      }
    }
    return fieldErrors.length === 0 ? { outcome: 'acceptable' } : { outcome: 'refused', fieldErrors };
  },
});
