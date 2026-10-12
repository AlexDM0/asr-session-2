/** The wire util pins the three field names of the preferences answer. */
import { describe, expect, it } from 'bun:test';

import { PreferencesWireUtil } from './PreferencesWireUtil';

describe('PreferencesWireUtil', () => {
  it('maps the preferences to the exact field names of PreferencesWire', () => {
    expect(PreferencesWireUtil.preferencesWireFor({ paperMail: true, newsletter: false, claimUpdateTextMessages: true })).toStrictEqual({
      paperMail:               true,
      newsletter:              false,
      claimUpdateTextMessages: true,
    });
  });
});

describe('PreferencesWireUtil.preferencesUpdateVerdictFor', () => {
  it('accepts each preference alone and several together', () => {
    expect(PreferencesWireUtil.preferencesUpdateVerdictFor({ paperMail: true })).toStrictEqual({ outcome: 'valid', update: { paperMail: true } });
    expect(PreferencesWireUtil.preferencesUpdateVerdictFor({ newsletter: false })).toStrictEqual({ outcome: 'valid', update: { newsletter: false } });
    expect(PreferencesWireUtil.preferencesUpdateVerdictFor({ claimUpdateTextMessages: true }))
      .toStrictEqual({ outcome: 'valid', update: { claimUpdateTextMessages: true } });
    expect(PreferencesWireUtil.preferencesUpdateVerdictFor({ newsletter: true, paperMail: false }))
      .toStrictEqual({ outcome: 'valid', update: { paperMail: false, newsletter: true } });
  });

  it('refuses an empty object as required on the field preferences', () => {
    expect(PreferencesWireUtil.preferencesUpdateVerdictFor({})).toStrictEqual({ outcome: 'invalid', fieldErrors: [{ field: 'preferences', reason: 'required' }] });
  });

  it('refuses null, a string and a number as an invalid format', () => {
    expect(PreferencesWireUtil.preferencesUpdateVerdictFor({ claimUpdateTextMessages: 0, paperMail: null, newsletter: 'true' })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'paperMail', reason: 'invalidFormat' },
        { field: 'newsletter', reason: 'invalidFormat' },
        { field: 'claimUpdateTextMessages', reason: 'invalidFormat' },
      ],
    });
  });

  it('refuses any other key as an unknown field after the known keys, in body order', () => {
    expect(PreferencesWireUtil.preferencesUpdateVerdictFor({ exampleKey: true, newsletter: 'yes', emailAddress: true })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'newsletter', reason: 'invalidFormat' },
        { field: 'exampleKey', reason: 'unknownField' },
        { field: 'emailAddress', reason: 'unknownField' },
      ],
    });
  });

  it('reads keys as own properties only, so an inherited preference never counts', () => {
    const inheritingBody: Record<string, unknown> = Object.create({ newsletter: true });
    inheritingBody['paperMail'] = true;

    expect(PreferencesWireUtil.preferencesUpdateVerdictFor(inheritingBody)).toStrictEqual({ outcome: 'valid', update: { paperMail: true } });
    expect(PreferencesWireUtil.preferencesUpdateVerdictFor(JSON.parse('{"__proto__": {"newsletter": true}}'))).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [{ field: '__proto__', reason: 'unknownField' }],
    });
  });
});
