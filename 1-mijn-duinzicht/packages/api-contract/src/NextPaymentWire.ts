export interface NextPaymentWire {
  readonly collectionDate: string;
  readonly amountCents:    number;
  readonly maskedAccount:  string;
}

export interface NextPaymentResultWire {
  readonly nextPayment: NextPaymentWire | null;
}
