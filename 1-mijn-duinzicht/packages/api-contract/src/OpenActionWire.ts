export interface UploadClaimPhotosActionWire {
  readonly kind:       'uploadClaimPhotos';
  readonly claimId:    string;
  readonly claimTitle: string;
  readonly deadline:   string;
}

export interface ConfirmEmailAddressActionWire {
  readonly kind:              'confirmEmailAddress';
  readonly lastConfirmedYear: number;
}

export type OpenActionWire = UploadClaimPhotosActionWire | ConfirmEmailAddressActionWire;

export interface OpenActionListWire {
  readonly openActions: readonly OpenActionWire[];
}
