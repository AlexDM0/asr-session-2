import type { CalendarDate } from './Profile';

export interface UploadClaimPhotosAction {
  readonly kind:       'uploadClaimPhotos';
  readonly claimId:    string;
  readonly claimTitle: string;
  readonly deadline:   CalendarDate;
}

export interface ConfirmEmailAddressAction {
  readonly kind:              'confirmEmailAddress';
  readonly lastConfirmedYear: number;
}

export type OpenAction = UploadClaimPhotosAction | ConfirmEmailAddressAction;
