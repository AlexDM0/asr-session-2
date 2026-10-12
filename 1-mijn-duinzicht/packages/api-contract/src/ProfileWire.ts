export type PaymentMethodWire = 'monthlyDirectDebit';

export interface ProfileAddressWire {
  readonly streetAndHouseNumber: string;
  readonly postcode:             string;
  readonly city:                 string;
}

export interface ProfileWire {
  readonly customerNumber:                string;
  readonly fullName:                      string;
  readonly firstName:                     string;
  readonly initials:                      string;
  readonly birthDate:                     string;
  readonly emailAddress:                  string;
  readonly emailAddressNeedsConfirmation: boolean;
  readonly emailAddressLastConfirmedYear: number;
  readonly phoneNumber:                   string;
  readonly address:                       ProfileAddressWire;
  readonly iban:                          string;
  readonly paymentMethod:                 PaymentMethodWire;
  readonly accountHolder:                 string;
}

export interface ContactDetailsUpdateWire {
  readonly emailAddress:         string;
  readonly phoneNumber:          string;
  readonly streetAndHouseNumber: string;
  readonly postcode:             string;
  readonly city:                 string;
}

export interface PaymentDetailsUpdateWire {
  readonly iban:          string;
  readonly accountHolder: string;
}
