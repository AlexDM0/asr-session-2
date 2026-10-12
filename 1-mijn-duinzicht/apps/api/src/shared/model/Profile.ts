export type PaymentMethod = 'monthlyDirectDebit';

/** A calendar date as `YYYY-MM-DD`, validated where it enters the application. */
export type CalendarDate = string;

/** A local Dutch date and time as `YYYY-MM-DDTHH:MM`, without a zone, validated where it enters the application. */
export type LocalDateTime = string;

export interface ProfileAddress {
  readonly streetAndHouseNumber: string;
  readonly postcode:             string;
  readonly city:                 string;
}

export interface Profile {
  readonly customerNumber:                string;
  readonly fullName:                      string;
  readonly firstName:                     string;
  readonly initials:                      string;
  readonly birthDate:                     CalendarDate;
  readonly emailAddress:                  string;
  readonly emailAddressNeedsConfirmation: boolean;
  readonly emailAddressLastConfirmedYear: number;
  readonly phoneNumber:                   string;
  readonly address:                       ProfileAddress;
  readonly iban:                          string;
  readonly paymentMethod:                 PaymentMethod;
  readonly accountHolder:                 string;
}

/** Normalised contact details on their way from the HTTP boundary to the writer. */
export interface ContactDetailsUpdate {
  readonly emailAddress:         string;
  readonly phoneNumber:          string;
  readonly streetAndHouseNumber: string;
  readonly postcode:             string;
  readonly city:                 string;
}

export interface PaymentDetailsUpdate {
  readonly iban:          string;
  readonly accountHolder: string;
}
