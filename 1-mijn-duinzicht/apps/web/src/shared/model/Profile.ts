export type PaymentMethod = 'monthlyDirectDebit';

export interface ProfileAddress {
  readonly streetAndHouseNumber: string;
  readonly postcode:             string;
  readonly city:                 string;
}

/** Dates are validated ISO strings (`YYYY-MM-DD`) that `DutchFormat` words on screen. */
export interface Profile {
  readonly customerNumber:                string;
  readonly fullName:                      string;
  readonly firstName:                     string;
  readonly initials:                      string;
  readonly birthDate:                     string;
  readonly emailAddress:                  string;
  readonly emailAddressNeedsConfirmation: boolean;
  readonly emailAddressLastConfirmedYear: number;
  readonly phoneNumber:                   string;
  readonly address:                       ProfileAddress;
  readonly iban:                          string;
  readonly paymentMethod:                 PaymentMethod;
  readonly accountHolder:                 string;
}
