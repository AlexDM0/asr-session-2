/** The wire util pins the next-payment answer, including the explicit `null` when nothing is scheduled. */
import { describe, expect, it } from 'bun:test';

import { NextPaymentWireUtil } from './NextPaymentWireUtil';

describe('NextPaymentWireUtil', () => {
  it('maps a next payment to the exact field names', () => {
    const nextPayment = { collectionDate: '2099-01-01', amountCents: 1234, maskedAccount: 'NL•• EXAM •••• 0000' };

    expect(NextPaymentWireUtil.nextPaymentResultWireFor(nextPayment)).toStrictEqual({ nextPayment: { ...nextPayment } });
  });

  it('sends null, never an omitted field, when nothing is scheduled', () => {
    expect(JSON.stringify(NextPaymentWireUtil.nextPaymentResultWireFor(null))).toBe('{"nextPayment":null}');
  });
});
