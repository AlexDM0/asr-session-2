export type ClaimCategoryWire = 'home' | 'car' | 'travel' | 'liability';

export type ClaimStatusWire = 'reported' | 'inProgress' | 'paidOut' | 'rejected';

export type ClaimStepStateWire = 'done' | 'current' | 'todo';

export interface ClaimSummaryWire {
  readonly id:                   string;
  readonly title:                string;
  readonly category:             ClaimCategoryWire;
  readonly policyId:             string;
  readonly policyName:           string;
  readonly reportedAt:           string;
  readonly status:               ClaimStatusWire;
  readonly handlerName:          string | null;
  readonly stepStates:           readonly ClaimStepStateWire[];
  readonly awaitsCustomerPhotos: boolean;
}

export interface ClaimStepWire {
  readonly title:          string;
  readonly description:    string;
  readonly state:          ClaimStepStateWire;
  readonly waitsForPhotos: boolean;
}

export interface ClaimDetailWire extends Omit<ClaimSummaryWire, 'stepStates'> {
  readonly incidentDate:  string | null;
  readonly description:   string | null;
  readonly photoDeadline: string | null;
  readonly steps:         readonly ClaimStepWire[];
}

export interface ClaimListWire {
  readonly claims: readonly ClaimSummaryWire[];
}

export interface ClaimCreationWire {
  readonly category:     ClaimCategoryWire;
  readonly policyId:     string;
  /** `YYYY-MM-DD`. */
  readonly incidentDate: string;
  readonly description:  string;
}
