export interface PreferencesWire {
  readonly paperMail:               boolean;
  readonly newsletter:              boolean;
  readonly claimUpdateTextMessages: boolean;
}

export type PreferencesUpdateWire = Partial<PreferencesWire>;
