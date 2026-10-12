export type ClaimCategory = 'home' | 'car' | 'travel' | 'liability';

export type ClaimStatus = 'reported' | 'inProgress' | 'paidOut' | 'rejected';

export type ClaimStepState = 'done' | 'current' | 'todo';

/** `reportedAt` is a validated local `YYYY-MM-DDTHH:MM`. */
export interface ClaimSummary {
  readonly id:                   string;
  readonly title:                string;
  readonly category:             ClaimCategory;
  readonly policyId:             string;
  readonly policyName:           string;
  readonly reportedAt:           string;
  readonly status:               ClaimStatus;
  readonly handlerName:          string | null;
  readonly stepStates:           readonly ClaimStepState[];
  readonly awaitsCustomerPhotos: boolean;
}
