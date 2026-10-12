import type { CalendarDate, LocalDateTime } from './Profile';

export type ClaimCategory = 'home' | 'car' | 'travel' | 'liability';

export type ClaimStatus = 'reported' | 'inProgress' | 'paidOut' | 'rejected';

export type ClaimStepState = 'done' | 'current' | 'todo';

export const CLAIM_CATEGORIES = ['home', 'car', 'travel', 'liability'] as const satisfies readonly ClaimCategory[];

export const CLAIM_STATUSES = ['reported', 'inProgress', 'paidOut', 'rejected'] as const satisfies readonly ClaimStatus[];

export const CLAIM_STEP_STATES = ['done', 'current', 'todo'] as const satisfies readonly ClaimStepState[];

export interface ClaimStep {
  readonly title:          string;
  readonly description:    string;
  readonly state:          ClaimStepState;
  readonly waitsForPhotos: boolean;
}

export interface Claim {
  readonly id:            string;
  readonly title:         string;
  readonly category:      ClaimCategory;
  readonly policyId:      string;
  readonly reportedAt:    LocalDateTime;
  readonly status:        ClaimStatus;
  readonly handlerName:   string | null;
  readonly incidentDate:  CalendarDate | null;
  readonly description:   string | null;
  readonly photoDeadline: CalendarDate | null;
  readonly steps:         readonly ClaimStep[];
}

/** True when the claim's current step waits for the customer's photos. */
export function claimAwaitsCustomerPhotos(claim: Claim): boolean {
  return claim.steps.some((step) => step.state === 'current' && step.waitsForPhotos);
}

/** An open claim is one whose status is reported or inProgress. */
export function claimIsOpen(claim: Claim): boolean {
  return claim.status === 'reported' || claim.status === 'inProgress';
}

export type PhotoMediaType = 'image/jpeg' | 'image/png' | 'image/heic';

/** A photo part of an upload request after its checks, with the media type detected from its content. */
export interface ReceivedPhoto {
  readonly originalFileName: string;
  readonly mediaType:        PhotoMediaType;
  readonly sizeBytes:        number;
  readonly content:          Uint8Array;
}

export interface ClaimPhoto {
  readonly photoId:          string;
  readonly claimId:          string;
  readonly originalFileName: string;
  readonly mediaType:        PhotoMediaType;
  readonly sizeBytes:        number;
  readonly storedFileName:   string;
  /** `YYYY-MM-DDTHH:MM:SS`, Europe/Amsterdam. */
  readonly uploadedAt:       string;
}

/** A claim report as read from the request, before the claim-report rules are applied. */
export interface ClaimCreation {
  readonly category:     ClaimCategory;
  readonly policyId:     string;
  readonly incidentDate: CalendarDate;
  readonly description:  string;
}
