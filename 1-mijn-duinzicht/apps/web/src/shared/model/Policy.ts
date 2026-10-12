export type PolicyKind = 'home' | 'contents' | 'car' | 'liability';

export type PolicyStatus = 'active' | 'ended';

export interface PolicySummary {
  readonly id:                  string;
  readonly policyNumber:        string;
  readonly kind:                PolicyKind;
  readonly name:                string;
  readonly subtitle:            string;
  readonly monthlyPremiumCents: number;
  readonly status:              PolicyStatus;
}
