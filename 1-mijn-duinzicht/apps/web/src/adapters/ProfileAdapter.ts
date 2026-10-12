import type { RecordReader } from '@mijn-duinzicht/record-reader/RecordReader';

import type { ReadVerdict } from '../lib/resource/ReadVerdict';
import type { Profile }     from '../shared/model/Profile';

import { ApiReadUtil } from './ApiReadUtil';

const LOWEST_CONFIRMATION_YEAR = 1900;
const HIGHEST_CONFIRMATION_YEAR = 9999;

function profileFrom(reader: RecordReader): Profile {
  return {
    customerNumber:                reader.nonEmptyString('customerNumber'),
    fullName:                      reader.nonEmptyString('fullName'),
    firstName:                     reader.nonEmptyString('firstName'),
    initials:                      reader.nonEmptyString('initials'),
    birthDate:                     reader.calendarDate('birthDate'),
    emailAddress:                  reader.nonEmptyString('emailAddress'),
    emailAddressNeedsConfirmation: reader.boolean('emailAddressNeedsConfirmation'),
    emailAddressLastConfirmedYear: reader.integer('emailAddressLastConfirmedYear', { minimum: LOWEST_CONFIRMATION_YEAR, maximum: HIGHEST_CONFIRMATION_YEAR }),
    phoneNumber:                   reader.nonEmptyString('phoneNumber'),
    address:                       reader.record('address', (addressReader) => ({
      streetAndHouseNumber: addressReader.nonEmptyString('streetAndHouseNumber'),
      postcode:             addressReader.nonEmptyString('postcode'),
      city:                 addressReader.nonEmptyString('city'),
    })),
    iban:          reader.nonEmptyString('iban'),
    paymentMethod: reader.oneOf('paymentMethod', ['monthlyDirectDebit']),
    accountHolder: reader.nonEmptyString('accountHolder'),
  };
}

export function loadProfile(signal: AbortSignal): Promise<ReadVerdict<Profile>> {
  return ApiReadUtil.readResource('/api/profile', signal, profileFrom);
}
