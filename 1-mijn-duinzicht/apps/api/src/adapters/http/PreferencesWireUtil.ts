import type { FieldErrorWire }  from '@mijn-duinzicht/api-contract/ApiErrorWire';
import type { PreferencesWire } from '@mijn-duinzicht/api-contract/PreferencesWire';

import type { PreferenceName, Preferences, PreferencesUpdate } from '../../shared/model/Preferences';

export type PreferencesUpdateVerdict =
  | { readonly outcome: 'valid'; readonly update: PreferencesUpdate }
  | { readonly outcome: 'invalid'; readonly fieldErrors: readonly FieldErrorWire[] };

const PREFERENCE_NAMES: readonly PreferenceName[] = ['paperMail', 'newsletter', 'claimUpdateTextMessages'];

function isPreferenceName(key: string): key is PreferenceName {
  return (PREFERENCE_NAMES as readonly string[]).includes(key);
}

export const PreferencesWireUtil = {
  preferencesWireFor(preferences: Preferences): PreferencesWire {
    return {
      paperMail:               preferences.paperMail,
      newsletter:              preferences.newsletter,
      claimUpdateTextMessages: preferences.claimUpdateTextMessages,
    };
  },

  /** The known keys in their order first, then every other key in body order; keys are read as own properties only. */
  preferencesUpdateVerdictFor(body: Readonly<Record<string, unknown>>): PreferencesUpdateVerdict {
    const bodyKeys = Object.keys(body);
    if (bodyKeys.length === 0) {
      return { outcome: 'invalid', fieldErrors: [{ field: 'preferences', reason: 'required' }] };
    }
    const fieldErrors: FieldErrorWire[] = [];
    const update: { [name in PreferenceName]?: boolean } = {};
    for (const preferenceName of PREFERENCE_NAMES) {
      if (!Object.hasOwn(body, preferenceName)) {
        continue;
      }
      const value = body[preferenceName];
      if (typeof value === 'boolean') {
        update[preferenceName] = value;
      } else {
        fieldErrors.push({ field: preferenceName, reason: 'invalidFormat' });
      }
    }
    for (const key of bodyKeys) {
      if (!isPreferenceName(key)) {
        fieldErrors.push({ field: key, reason: 'unknownField' });
      }
    }
    return fieldErrors.length > 0 ? { outcome: 'invalid', fieldErrors } : { outcome: 'valid', update };
  },
} as const;
