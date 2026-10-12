import { PROFILE_DETAIL_LIMITS } from './constants/PROFILE_DETAIL_LIMITS';

export type ProfileDetailField = 'emailAddress' | 'phoneNumber' | 'streetAndHouseNumber' | 'postcode' | 'city' | 'iban' | 'accountHolder';

export type ProfileDetailRuleReason = 'required' | 'invalidFormat' | 'tooLong';

export type ProfileDetailVerdict =
  | { readonly outcome: 'valid'; readonly normalizedValue: string }
  | { readonly outcome: 'invalid'; readonly reason: ProfileDetailRuleReason };

type FormatVerdict = { readonly outcome: 'valid'; readonly normalizedValue: string } | { readonly outcome: 'invalidFormat' };

const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_NUMBER_PATTERN = /^(0\d{9}|\+31\d{9})$/;
const DIGIT_PATTERN = /\d/;
const POSTCODE_PATTERN = /^(\d{4})\s?([A-Z]{2})$/;
const IBAN_PATTERN = /^NL\d{2}[A-Z]{4}\d{10}$/;
const IBAN_GROUP_PATTERN = /.{1,4}/g;

function keptWhen(isValid: boolean, trimmedValue: string): FormatVerdict {
  return isValid ? { outcome: 'valid', normalizedValue: trimmedValue } : { outcome: 'invalidFormat' };
}

function postcodeFormatVerdict(trimmedValue: string): FormatVerdict {
  const match = POSTCODE_PATTERN.exec(trimmedValue.toUpperCase());
  const digits = match?.[1];
  const letters = match?.[2];
  return digits === undefined || letters === undefined ? { outcome: 'invalidFormat' } : { outcome: 'valid', normalizedValue: `${digits} ${letters}` };
}

function ibanFormatVerdict(trimmedValue: string): FormatVerdict {
  const compactIban = trimmedValue.replaceAll(' ', '').toUpperCase();
  if (!IBAN_PATTERN.test(compactIban)) {
    return { outcome: 'invalidFormat' };
  }
  return { outcome: 'valid', normalizedValue: (compactIban.match(IBAN_GROUP_PATTERN) ?? []).join(' ') };
}

const FORMAT_VERDICT_BY_FIELD: Readonly<Record<ProfileDetailField, (trimmedValue: string) => FormatVerdict>> = {
  emailAddress:         (trimmedValue) => keptWhen(EMAIL_ADDRESS_PATTERN.test(trimmedValue), trimmedValue),
  phoneNumber:          (trimmedValue) => keptWhen(PHONE_NUMBER_PATTERN.test(trimmedValue.replaceAll(/[\s-]/g, '')), trimmedValue),
  streetAndHouseNumber: (trimmedValue) => keptWhen(DIGIT_PATTERN.test(trimmedValue), trimmedValue),
  postcode:             postcodeFormatVerdict,
  city:                 (trimmedValue) => keptWhen(true, trimmedValue),
  iban:                 ibanFormatVerdict,
  accountHolder:        (trimmedValue) => keptWhen(true, trimmedValue),
};

/** The same trimming, validation and normalisation of the editable profile details for the browser and the API. */
export const ProfileDetailRuleUtil = {
  maximumCharactersFor(field: ProfileDetailField): number {
    return field === 'emailAddress' ? PROFILE_DETAIL_LIMITS.EMAIL_ADDRESS_MAXIMUM_CHARACTERS : PROFILE_DETAIL_LIMITS.TEXT_FIELD_MAXIMUM_CHARACTERS;
  },

  verdictFor(field: ProfileDetailField, enteredValue: string): ProfileDetailVerdict {
    const trimmedValue = enteredValue.trim();
    if (trimmedValue === '') {
      return { outcome: 'invalid', reason: 'required' };
    }
    if (Array.from(trimmedValue).length > ProfileDetailRuleUtil.maximumCharactersFor(field)) {
      return { outcome: 'invalid', reason: 'tooLong' };
    }
    const formatVerdict = FORMAT_VERDICT_BY_FIELD[field](trimmedValue);
    return formatVerdict.outcome === 'valid' ? formatVerdict : { outcome: 'invalid', reason: 'invalidFormat' };
  },
} as const;
