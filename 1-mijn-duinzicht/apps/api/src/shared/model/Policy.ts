export type PolicyKind = 'home' | 'contents' | 'car' | 'liability';

export type PolicyStatus = 'active' | 'ended';

export const POLICY_KINDS = ['home', 'contents', 'car', 'liability'] as const satisfies readonly PolicyKind[];

export const POLICY_STATUSES = ['active', 'ended'] as const satisfies readonly PolicyStatus[];

export interface PolicyFact {
  readonly label: string;
  readonly value: string;
}

export interface Policy {
  readonly id:                  string;
  readonly kind:                PolicyKind;
  readonly name:                string;
  readonly subtitle:            string;
  readonly monthlyPremiumCents: number;
  readonly status:              PolicyStatus;
  readonly facts:               readonly PolicyFact[];
  readonly coverage:            readonly string[];
}
