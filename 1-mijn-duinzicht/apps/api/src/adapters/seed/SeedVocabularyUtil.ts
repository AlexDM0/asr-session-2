import type { ClaimCategory, ClaimStatus, ClaimStepState } from '../../shared/model/Claim';
import type { PolicyKind, PolicyStatus }                   from '../../shared/model/Policy';
import type { PaymentMethod }                              from '../../shared/model/Profile';

/**
 * Maps the Dutch enumeration values in the seed to the English internal values. Each lookup
 * returns a verdict, so the seed ingestion records every unknown value instead of stopping at the first.
 */
export type VocabularyVerdict<InternalValue> =
  | { readonly outcome: 'known'; readonly value: InternalValue }
  | { readonly outcome: 'unknown'; readonly problem: string };

const POLICY_KIND_BY_SEED_VALUE: Readonly<Record<string, PolicyKind>> = {
  woonhuis:          'home',
  inboedel:          'contents',
  auto:              'car',
  aansprakelijkheid: 'liability',
};

const POLICY_STATUS_BY_SEED_VALUE: Readonly<Record<string, PolicyStatus>> = {
  actief:    'active',
  beeindigd: 'ended',
};

const CLAIM_STATUS_BY_SEED_VALUE: Readonly<Record<string, ClaimStatus>> = {
  gemeld:         'reported',
  in_behandeling: 'inProgress',
  uitbetaald:     'paidOut',
  afgewezen:      'rejected',
};

const CLAIM_CATEGORY_BY_SEED_VALUE: Readonly<Record<string, ClaimCategory>> = {
  huis:  'home',
  auto:  'car',
  reis:  'travel',
  ander: 'liability',
};

const CLAIM_STEP_STATE_BY_SEED_VALUE: Readonly<Record<string, ClaimStepState>> = {
  done:    'done',
  current: 'current',
  todo:    'todo',
};

const PAYMENT_METHOD_BY_SEED_VALUE: Readonly<Record<string, PaymentMethod>> = { 'automatische incasso maandelijks': 'monthlyDirectDebit', };

function internalValueFor<InternalValue>(table: Readonly<Record<string, InternalValue>>, fieldName: string, seedValue: string): VocabularyVerdict<InternalValue> {
  if (Object.hasOwn(table, seedValue)) {
    const internalValue = table[seedValue];
    if (internalValue !== undefined) {
      return { outcome: 'known', value: internalValue };
    }
  }
  return { outcome: 'unknown', problem: `The seed field ${fieldName} has the unknown value "${seedValue}".` };
}

export const SeedVocabularyUtil = {
  policyKindFor(seedValue: string): VocabularyVerdict<PolicyKind> {
    return internalValueFor(POLICY_KIND_BY_SEED_VALUE, 'policy type', seedValue);
  },

  policyStatusFor(seedValue: string): VocabularyVerdict<PolicyStatus> {
    return internalValueFor(POLICY_STATUS_BY_SEED_VALUE, 'policy status', seedValue);
  },

  claimStatusFor(seedValue: string): VocabularyVerdict<ClaimStatus> {
    return internalValueFor(CLAIM_STATUS_BY_SEED_VALUE, 'claim status', seedValue);
  },

  claimCategoryFor(seedValue: string): VocabularyVerdict<ClaimCategory> {
    return internalValueFor(CLAIM_CATEGORY_BY_SEED_VALUE, 'claim category', seedValue);
  },

  claimStepStateFor(seedValue: string): VocabularyVerdict<ClaimStepState> {
    return internalValueFor(CLAIM_STEP_STATE_BY_SEED_VALUE, 'step state', seedValue);
  },

  paymentMethodFor(seedValue: string): VocabularyVerdict<PaymentMethod> {
    return internalValueFor(PAYMENT_METHOD_BY_SEED_VALUE, 'customer payment method', seedValue);
  },
} as const;
