/** The wire util pins the exact field names of the profile answer, including the nested address. */
import { describe, expect, it } from 'bun:test';

import { SYNTHETIC_PROFILE } from '../store/scratchStoreConnection.setup';

import { ProfileWireUtil } from './ProfileWireUtil';

describe('ProfileWireUtil', () => {
  it('maps the profile to the exact field names of ProfileWire', () => {
    expect(ProfileWireUtil.profileWireFor(SYNTHETIC_PROFILE)).toStrictEqual({
      customerNumber:                '12345678',
      fullName:                      'Alex Example',
      firstName:                     'Alex',
      initials:                      'AE',
      birthDate:                     '2000-01-02',
      emailAddress:                  'alex@example.com',
      emailAddressNeedsConfirmation: true,
      emailAddressLastConfirmedYear: 2020,
      phoneNumber:                   '06 00 00 00 00',
      address:                       { streetAndHouseNumber: 'Example Street 1', postcode: '1234 AB', city: 'Example City' },
      iban:                          'NL00 EXAM 0000 0000 00',
      paymentMethod:                 'monthlyDirectDebit',
      accountHolder:                 'A. Example',
    });
  });
});

describe('ProfileWireUtil.contactDetailsUpdateVerdictFor', () => {
  const VALID_CONTACT_DETAILS = {
    emailAddress:         ' alex@example.com ',
    phoneNumber:          '06-00 00 00 00',
    streetAndHouseNumber: 'Example Street 1',
    postcode:             '1234ab',
    city:                 'Example City',
  };

  it('accepts a valid body and answers the normalised update', () => {
    expect(ProfileWireUtil.contactDetailsUpdateVerdictFor(VALID_CONTACT_DETAILS)).toStrictEqual({
      outcome: 'valid',
      update:  {
        emailAddress:         'alex@example.com',
        phoneNumber:          '06-00 00 00 00',
        streetAndHouseNumber: 'Example Street 1',
        postcode:             '1234 AB',
        city:                 'Example City',
      },
    });
  });

  it('refuses a missing key, null and a whitespace-only string as required', () => {
    const { emailAddress: _missingEmailAddress, ...withoutEmailAddress } = VALID_CONTACT_DETAILS;
    expect(ProfileWireUtil.contactDetailsUpdateVerdictFor({ ...withoutEmailAddress, phoneNumber: null, city: '   ' })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'emailAddress', reason: 'required' },
        { field: 'phoneNumber', reason: 'required' },
        { field: 'city', reason: 'required' },
      ],
    });
  });

  it('refuses a number, a boolean, an object and an array as an invalid format', () => {
    expect(ProfileWireUtil.contactDetailsUpdateVerdictFor({
      ...VALID_CONTACT_DETAILS,
      emailAddress:         1,
      phoneNumber:          true,
      streetAndHouseNumber: { street: 'Example Street 1' },
      postcode:             ['1234 AB'],
    })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'emailAddress', reason: 'invalidFormat' },
        { field: 'phoneNumber', reason: 'invalidFormat' },
        { field: 'streetAndHouseNumber', reason: 'invalidFormat' },
        { field: 'postcode', reason: 'invalidFormat' },
      ],
    });
  });

  it('passes the rule reasons of the rules package through', () => {
    expect(ProfileWireUtil.contactDetailsUpdateVerdictFor({
      ...VALID_CONTACT_DETAILS,
      emailAddress:         'alex@',
      streetAndHouseNumber: 'Example Street',
      city:                 'a'.repeat(101),
    })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'emailAddress', reason: 'invalidFormat' },
        { field: 'streetAndHouseNumber', reason: 'invalidFormat' },
        { field: 'city', reason: 'tooLong' },
      ],
    });
  });

  it('refuses every read-only profile key as a read-only field', () => {
    const readOnlyKeys = ['customerNumber', 'fullName', 'firstName', 'initials', 'birthDate', 'paymentMethod', 'emailAddressNeedsConfirmation', 'emailAddressLastConfirmedYear'];
    const body = Object.fromEntries([...Object.entries(VALID_CONTACT_DETAILS), ...readOnlyKeys.map((key) => [key, 'x'])]);

    expect(ProfileWireUtil.contactDetailsUpdateVerdictFor(body)).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: readOnlyKeys.map((key) => ({ field: key, reason: 'readOnlyField' })),
    });
  });

  it('refuses payment fields, the address and any other key as unknown fields', () => {
    expect(ProfileWireUtil.contactDetailsUpdateVerdictFor({
      ...VALID_CONTACT_DETAILS,
      iban:          'NL00 EXAM 0000 0000 00',
      accountHolder: 'A. Example',
      address:       {},
      exampleKey:    'x',
    })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'iban', reason: 'unknownField' },
        { field: 'accountHolder', reason: 'unknownField' },
        { field: 'address', reason: 'unknownField' },
        { field: 'exampleKey', reason: 'unknownField' },
      ],
    });
  });

  it('reports every problem at once, the shape fields first and then extra keys in body order', () => {
    expect(ProfileWireUtil.contactDetailsUpdateVerdictFor({
      exampleKey:   'x',
      fullName:     'A',
      ...VALID_CONTACT_DETAILS,
      postcode:     '12345 AB',
      emailAddress: 'x',
    })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'emailAddress', reason: 'invalidFormat' },
        { field: 'postcode', reason: 'invalidFormat' },
        { field: 'exampleKey', reason: 'unknownField' },
        { field: 'fullName', reason: 'readOnlyField' },
      ],
    });
  });

  it('reads keys as own properties only, so an inherited key never counts as a field', () => {
    const inheritingBody: Record<string, unknown> = Object.create({ emailAddress: 'alex@example.com' });
    Object.assign(inheritingBody, { ...VALID_CONTACT_DETAILS, emailAddress: undefined });
    delete inheritingBody['emailAddress'];
    const parsedBody: Record<string, unknown> = JSON.parse('{"__proto__": {"city": "Example City"}}');

    expect(ProfileWireUtil.contactDetailsUpdateVerdictFor(inheritingBody)).toMatchObject({ outcome: 'invalid', fieldErrors: [{ field: 'emailAddress', reason: 'required' }] });
    expect(ProfileWireUtil.contactDetailsUpdateVerdictFor(parsedBody)).toMatchObject({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'emailAddress', reason: 'required' },
        { field: 'phoneNumber', reason: 'required' },
        { field: 'streetAndHouseNumber', reason: 'required' },
        { field: 'postcode', reason: 'required' },
        { field: 'city', reason: 'required' },
        { field: '__proto__', reason: 'unknownField' },
      ],
    });
  });
});

describe('ProfileWireUtil.paymentDetailsUpdateVerdictFor', () => {
  const VALID_PAYMENT_DETAILS = { iban: 'nl00exam0000000000', accountHolder: ' A. Example ' };

  it('accepts a valid body and answers the IBAN in upper-case groups of four', () => {
    expect(ProfileWireUtil.paymentDetailsUpdateVerdictFor(VALID_PAYMENT_DETAILS)).toStrictEqual({
      outcome: 'valid',
      update:  { iban: 'NL00 EXAM 0000 0000 00', accountHolder: 'A. Example' },
    });
  });

  it('refuses a missing IBAN as required and a whitespace-only account holder as required', () => {
    expect(ProfileWireUtil.paymentDetailsUpdateVerdictFor({ accountHolder: '  ' })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [{ field: 'iban', reason: 'required' }, { field: 'accountHolder', reason: 'required' }],
    });
  });

  it('refuses a foreign IBAN as an invalid format and a too long account holder as too long', () => {
    expect(ProfileWireUtil.paymentDetailsUpdateVerdictFor({ iban: 'BE68 5390 0754 7034', accountHolder: 'a'.repeat(101) })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [{ field: 'iban', reason: 'invalidFormat' }, { field: 'accountHolder', reason: 'tooLong' }],
    });
  });

  it('refuses a non-string value as an invalid format', () => {
    expect(ProfileWireUtil.paymentDetailsUpdateVerdictFor({ iban: 1, accountHolder: false })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [{ field: 'iban', reason: 'invalidFormat' }, { field: 'accountHolder', reason: 'invalidFormat' }],
    });
  });

  it('refuses the payment method and the other read-only keys, then contact fields and the address as unknown, in body order', () => {
    expect(ProfileWireUtil.paymentDetailsUpdateVerdictFor({
      emailAddress:  'alex@example.com',
      paymentMethod: 'monthlyDirectDebit',
      ...VALID_PAYMENT_DETAILS,
      address:       {},
      fullName:      'A',
    })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'emailAddress', reason: 'unknownField' },
        { field: 'paymentMethod', reason: 'readOnlyField' },
        { field: 'address', reason: 'unknownField' },
        { field: 'fullName', reason: 'readOnlyField' },
      ],
    });
  });

  it('reports the shape fields first in the order iban, accountHolder', () => {
    expect(ProfileWireUtil.paymentDetailsUpdateVerdictFor({ exampleKey: 'x', accountHolder: '', iban: 'x' })).toStrictEqual({
      outcome:     'invalid',
      fieldErrors: [
        { field: 'iban', reason: 'invalidFormat' },
        { field: 'accountHolder', reason: 'required' },
        { field: 'exampleKey', reason: 'unknownField' },
      ],
    });
  });
});
