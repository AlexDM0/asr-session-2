import type { CalendarDate } from './Profile';

export interface DirectDebitSchedule {
  readonly nextCollectionDate: CalendarDate;
}

/** Derived on every read, never stored: the amount is the sum of the running policies' premiums and the account is masked from the IBAN. */
export interface NextPayment {
  readonly collectionDate: CalendarDate;
  readonly amountCents:    number;
  readonly maskedAccount:  string;
}
