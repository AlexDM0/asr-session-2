export interface Preferences {
  readonly paperMail:               boolean;
  readonly newsletter:              boolean;
  readonly claimUpdateTextMessages: boolean;
}

export type PreferenceName = 'paperMail' | 'newsletter' | 'claimUpdateTextMessages';

/** At least one key, checked at the HTTP boundary. */
export type PreferencesUpdate = { readonly [name in PreferenceName]?: boolean };
