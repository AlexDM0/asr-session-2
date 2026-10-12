export type PolicyKindWire = 'home' | 'contents' | 'car' | 'liability';

export type PolicyStatusWire = 'active' | 'ended';

export interface PolicySummaryWire {
  readonly id:                  string;
  readonly policyNumber:        string;
  readonly kind:                PolicyKindWire;
  readonly name:                string;
  readonly subtitle:            string;
  readonly monthlyPremiumCents: number;
  readonly status:              PolicyStatusWire;
}

export interface PolicyFactWire {
  readonly label: string;
  readonly value: string;
}

export interface PolicyDetailWire extends PolicySummaryWire {
  readonly facts:    readonly PolicyFactWire[];
  readonly coverage: readonly string[];
}

export interface PolicyListWire {
  readonly policies: readonly PolicySummaryWire[];
}
