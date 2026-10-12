import type { DirectDebitSchedule, NextPayment } from '../../shared/model/DirectDebitSchedule';
import type { Policy }                           from '../../shared/model/Policy';

const COUNTRY_CODE_LENGTH = 2;
const BANK_CODE_START = 4;
const BANK_CODE_END = 8;
const VISIBLE_TRAILING_CHARACTERS = 4;

export const NextPaymentUtil = {
  /** The sum of the monthly premiums of the running (active) policies only. */
  amountCentsFor(policies: readonly Policy[]): number {
    return policies.filter((policy) => policy.status === 'active').reduce((total, policy) => total + policy.monthlyPremiumCents, 0);
  },

  /** Country code and `••`, the bank code, `••••`, and the last four characters of the IBAN without its spaces. */
  maskedAccountFor(iban: string): string {
    const compactIban = iban.replaceAll(' ', '');
    const countryCode = compactIban.slice(0, COUNTRY_CODE_LENGTH);
    const bankCode = compactIban.slice(BANK_CODE_START, BANK_CODE_END);
    const trailingCharacters = compactIban.slice(-VISIBLE_TRAILING_CHARACTERS);
    return `${countryCode}•• ${bankCode} •••• ${trailingCharacters}`;
  },

  /** `null` when no collection date is stored. */
  nextPaymentFor(schedule: DirectDebitSchedule | null, policies: readonly Policy[], iban: string): NextPayment | null {
    if (schedule === null) {
      return null;
    }
    return {
      collectionDate: schedule.nextCollectionDate,
      amountCents:    NextPaymentUtil.amountCentsFor(policies),
      maskedAccount:  NextPaymentUtil.maskedAccountFor(iban),
    };
  },
} as const;
