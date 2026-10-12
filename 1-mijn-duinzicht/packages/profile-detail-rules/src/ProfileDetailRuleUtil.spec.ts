/**
 * Pins the field rules the browser and the API share: the order required → tooLong → format, the
 * literal reading of each format rule, the stored normal forms, and character counting in code points.
 */
import { describe, expect, it } from 'bun:test';

import { ProfileDetailRuleUtil } from './ProfileDetailRuleUtil';

function reasonFor(field: Parameters<typeof ProfileDetailRuleUtil.verdictFor>[0], enteredValue: string): string {
  const verdict = ProfileDetailRuleUtil.verdictFor(field, enteredValue);
  return verdict.outcome === 'valid' ? 'valid' : verdict.reason;
}

function normalizedValueFor(field: Parameters<typeof ProfileDetailRuleUtil.verdictFor>[0], enteredValue: string): string | null {
  const verdict = ProfileDetailRuleUtil.verdictFor(field, enteredValue);
  return verdict.outcome === 'valid' ? verdict.normalizedValue : null;
}

describe('ProfileDetailRuleUtil required and length rules', () => {
  it('refuses a whitespace-only value of every field as required', () => {
    for (const field of ['emailAddress', 'phoneNumber', 'streetAndHouseNumber', 'postcode', 'city', 'iban', 'accountHolder'] as const) {
      expect(reasonFor(field, '   ')).toBe('required');
    }
  });

  it('accepts 100 characters for a text field and refuses 101 as too long', () => {
    expect(reasonFor('city', 'a'.repeat(100))).toBe('valid');
    expect(reasonFor('city', 'a'.repeat(101))).toBe('tooLong');
    expect(reasonFor('accountHolder', 'a'.repeat(101))).toBe('tooLong');
  });

  it('accepts 254 characters for an e-mail address and refuses 255 as too long', () => {
    const domain = '@example.nl';
    expect(reasonFor('emailAddress', `${'a'.repeat(254 - domain.length)}${domain}`)).toBe('valid');
    expect(reasonFor('emailAddress', `${'a'.repeat(255 - domain.length)}${domain}`)).toBe('tooLong');
  });

  it('counts an emoji as one character', () => {
    expect(reasonFor('city', '😀'.repeat(100))).toBe('valid');
    expect(reasonFor('city', '😀'.repeat(101))).toBe('tooLong');
  });

  it('checks the length before the format', () => {
    expect(reasonFor('postcode', '1'.repeat(101))).toBe('tooLong');
  });

  it('measures the length after trimming', () => {
    expect(reasonFor('city', `  ${'a'.repeat(100)}  `)).toBe('valid');
  });
});

describe('ProfileDetailRuleUtil e-mail address', () => {
  it('accepts an address with text before the at sign and a dotted domain, kept trimmed with its case', () => {
    expect(normalizedValueFor('emailAddress', ' Alex@Example.com ')).toBe('Alex@Example.com');
  });

  it('refuses an address without a domain as an invalid format', () => {
    expect(reasonFor('emailAddress', 'alex@')).toBe('invalidFormat');
  });

  it('refuses a domain without text on both sides of its dot as an invalid format', () => {
    expect(reasonFor('emailAddress', 'x@example.')).toBe('invalidFormat');
    expect(reasonFor('emailAddress', 'x@.nl')).toBe('invalidFormat');
  });

  it('refuses an address with a space or two at signs as an invalid format', () => {
    expect(reasonFor('emailAddress', 'alex example@example.com')).toBe('invalidFormat');
    expect(reasonFor('emailAddress', 'alex@@example.com')).toBe('invalidFormat');
    expect(reasonFor('emailAddress', 'example.com')).toBe('invalidFormat');
  });
});

describe('ProfileDetailRuleUtil phone number', () => {
  it('accepts the 0 and +31 forms with spaces and hyphens and stores them trimmed as entered', () => {
    expect(normalizedValueFor('phoneNumber', ' 06 00 00 00 00 ')).toBe('06 00 00 00 00');
    expect(normalizedValueFor('phoneNumber', '06-00000000')).toBe('06-00000000');
    expect(normalizedValueFor('phoneNumber', '+31 6 0000 0000')).toBe('+31 6 0000 0000');
  });

  it('refuses too few digits, other country codes and letters as an invalid format', () => {
    expect(reasonFor('phoneNumber', '06 0000 000')).toBe('invalidFormat');
    expect(reasonFor('phoneNumber', '+32 6 0000 0000')).toBe('invalidFormat');
    expect(reasonFor('phoneNumber', '06 abcd efgh')).toBe('invalidFormat');
  });

  it('refuses full-width digits as an invalid format', () => {
    expect(reasonFor('phoneNumber', '０６００００００００')).toBe('invalidFormat');
  });
});

describe('ProfileDetailRuleUtil street and house number', () => {
  it('accepts a street with a digit, stored trimmed', () => {
    expect(normalizedValueFor('streetAndHouseNumber', ' Example Street 1 ')).toBe('Example Street 1');
  });

  it('refuses a street without a digit as an invalid format', () => {
    expect(reasonFor('streetAndHouseNumber', 'Example Street')).toBe('invalidFormat');
  });
});

describe('ProfileDetailRuleUtil postcode', () => {
  it('stores a lower-case postcode without a space as four digits, a space and two capitals', () => {
    expect(normalizedValueFor('postcode', '1234ab')).toBe('1234 AB');
    expect(normalizedValueFor('postcode', '1234 AB')).toBe('1234 AB');
  });

  it('refuses a postcode with five digits as an invalid format', () => {
    expect(reasonFor('postcode', '35210 AB')).toBe('invalidFormat');
  });

  it('refuses a postcode with one letter or letters first as an invalid format', () => {
    expect(reasonFor('postcode', '1234 A')).toBe('invalidFormat');
    expect(reasonFor('postcode', 'AB 1234')).toBe('invalidFormat');
  });
});

describe('ProfileDetailRuleUtil city and account holder', () => {
  it('accepts any non-empty text, stored trimmed', () => {
    expect(normalizedValueFor('city', ' Example City ')).toBe('Example City');
    expect(normalizedValueFor('accountHolder', ' A. Example')).toBe('A. Example');
  });
});

describe('ProfileDetailRuleUtil IBAN', () => {
  it('stores a lower-case unspaced Dutch IBAN in upper-case groups of four', () => {
    expect(normalizedValueFor('iban', 'nl00exam0000000000')).toBe('NL00 EXAM 0000 0000 00');
  });

  it('keeps an already grouped Dutch IBAN unchanged', () => {
    expect(normalizedValueFor('iban', 'NL00 EXAM 0000 0000 00')).toBe('NL00 EXAM 0000 0000 00');
  });

  it('refuses a foreign IBAN and a short Dutch IBAN as an invalid format', () => {
    expect(reasonFor('iban', 'BE68 5390 0754 7034')).toBe('invalidFormat');
    expect(reasonFor('iban', 'NL00 EXAM 1234')).toBe('invalidFormat');
  });

  it('does not check the mod-97 checksum', () => {
    expect(reasonFor('iban', 'NL00 EXAM 1111 1111 11')).toBe('valid');
  });
});

describe('ProfileDetailRuleUtil.maximumCharactersFor', () => {
  it('allows 254 characters for the e-mail address and 100 for the other fields', () => {
    expect(ProfileDetailRuleUtil.maximumCharactersFor('emailAddress')).toBe(254);
    expect(ProfileDetailRuleUtil.maximumCharactersFor('postcode')).toBe(100);
  });
});
