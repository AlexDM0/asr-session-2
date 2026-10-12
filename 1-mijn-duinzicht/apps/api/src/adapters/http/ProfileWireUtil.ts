import type { FieldErrorWire }                            from '@mijn-duinzicht/api-contract/ApiErrorWire';
import type { ProfileWire }                               from '@mijn-duinzicht/api-contract/ProfileWire';
import { ProfileDetailRuleUtil, type ProfileDetailField } from '@mijn-duinzicht/profile-detail-rules/ProfileDetailRuleUtil';

import type { ContactDetailsUpdate, PaymentDetailsUpdate, Profile } from '../../shared/model/Profile';

export type ProfileUpdateVerdict<Update> =
  | { readonly outcome: 'valid'; readonly update: Update }
  | { readonly outcome: 'invalid'; readonly fieldErrors: readonly FieldErrorWire[] };

type RequestBody = Readonly<Record<string, unknown>>;

type FieldValuesVerdict<Field extends ProfileDetailField> =
  | { readonly outcome: 'valid'; readonly values: Readonly<Record<Field, string>> }
  | { readonly outcome: 'invalid'; readonly fieldErrors: readonly FieldErrorWire[] };

/** Every `ProfileWire` key that no profile write can change. */
const READ_ONLY_PROFILE_KEYS: readonly string[] = [
  'customerNumber',
  'fullName',
  'firstName',
  'initials',
  'birthDate',
  'paymentMethod',
  'emailAddressNeedsConfirmation',
  'emailAddressLastConfirmedYear',
];

const CONTACT_DETAILS_FIELDS = ['emailAddress', 'phoneNumber', 'streetAndHouseNumber', 'postcode', 'city'] as const;

const PAYMENT_DETAILS_FIELDS = ['iban', 'accountHolder'] as const;

function fieldErrorFor(field: ProfileDetailField, enteredValue: unknown): FieldErrorWire | string {
  if (enteredValue === undefined || enteredValue === null) {
    return { field, reason: 'required' };
  }
  if (typeof enteredValue !== 'string') {
    return { field, reason: 'invalidFormat' };
  }
  const verdict = ProfileDetailRuleUtil.verdictFor(field, enteredValue);
  return verdict.outcome === 'valid' ? verdict.normalizedValue : { field, reason: verdict.reason };
}

/** Checks the request shape's fields in their order, then refuses every extra key in body order; keys are read as own properties only. */
function fieldValuesVerdictFor<Field extends ProfileDetailField>(body: RequestBody, fields: readonly Field[]): FieldValuesVerdict<Field> {
  const fieldErrors: FieldErrorWire[] = [];
  const values: Partial<Record<Field, string>> = {};
  for (const field of fields) {
    const normalizedValueOrError = fieldErrorFor(field, Object.hasOwn(body, field) ? body[field] : undefined);
    if (typeof normalizedValueOrError === 'string') {
      values[field] = normalizedValueOrError;
    } else {
      fieldErrors.push(normalizedValueOrError);
    }
  }
  const knownFields: readonly string[] = fields;
  for (const key of Object.keys(body)) {
    if (!knownFields.includes(key)) {
      fieldErrors.push({ field: key, reason: READ_ONLY_PROFILE_KEYS.includes(key) ? 'readOnlyField' : 'unknownField' });
    }
  }
  if (fieldErrors.length > 0) {
    return { outcome: 'invalid', fieldErrors };
  }
  return { outcome: 'valid', values: values as Readonly<Record<Field, string>> };
}

export const ProfileWireUtil = {
  profileWireFor(profile: Profile): ProfileWire {
    return {
      customerNumber:                profile.customerNumber,
      fullName:                      profile.fullName,
      firstName:                     profile.firstName,
      initials:                      profile.initials,
      birthDate:                     profile.birthDate,
      emailAddress:                  profile.emailAddress,
      emailAddressNeedsConfirmation: profile.emailAddressNeedsConfirmation,
      emailAddressLastConfirmedYear: profile.emailAddressLastConfirmedYear,
      phoneNumber:                   profile.phoneNumber,
      address:                       {
        streetAndHouseNumber: profile.address.streetAndHouseNumber,
        postcode:             profile.address.postcode,
        city:                 profile.address.city,
      },
      iban:          profile.iban,
      paymentMethod: profile.paymentMethod,
      accountHolder: profile.accountHolder,
    };
  },

  contactDetailsUpdateVerdictFor(body: RequestBody): ProfileUpdateVerdict<ContactDetailsUpdate> {
    const verdict = fieldValuesVerdictFor(body, CONTACT_DETAILS_FIELDS);
    if (verdict.outcome === 'invalid') {
      return verdict;
    }
    return {
      outcome: 'valid',
      update:  {
        emailAddress:         verdict.values.emailAddress,
        phoneNumber:          verdict.values.phoneNumber,
        streetAndHouseNumber: verdict.values.streetAndHouseNumber,
        postcode:             verdict.values.postcode,
        city:                 verdict.values.city,
      },
    };
  },

  paymentDetailsUpdateVerdictFor(body: RequestBody): ProfileUpdateVerdict<PaymentDetailsUpdate> {
    const verdict = fieldValuesVerdictFor(body, PAYMENT_DETAILS_FIELDS);
    if (verdict.outcome === 'invalid') {
      return verdict;
    }
    return { outcome: 'valid', update: { iban: verdict.values.iban, accountHolder: verdict.values.accountHolder } };
  },
} as const;
