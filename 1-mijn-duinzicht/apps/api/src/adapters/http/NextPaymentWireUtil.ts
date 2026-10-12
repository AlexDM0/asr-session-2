import type { NextPaymentResultWire } from '@mijn-duinzicht/api-contract/NextPaymentWire';

import type { NextPayment } from '../../shared/model/DirectDebitSchedule';

export const NextPaymentWireUtil = {
  /** `null` means nothing is scheduled; it is sent, never omitted. */
  nextPaymentResultWireFor(nextPayment: NextPayment | null): NextPaymentResultWire {
    if (nextPayment === null) {
      return { nextPayment: null };
    }
    return {
      nextPayment: {
        collectionDate: nextPayment.collectionDate,
        amountCents:    nextPayment.amountCents,
        maskedAccount:  nextPayment.maskedAccount,
      },
    };
  },
} as const;
