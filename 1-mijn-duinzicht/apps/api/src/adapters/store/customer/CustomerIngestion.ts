import { RecordReader }  from '@mijn-duinzicht/record-reader/RecordReader';
import type { Database } from 'bun:sqlite';


import type { DirectDebitSchedule }                   from '../../../shared/model/DirectDebitSchedule';
import type { Preferences }                           from '../../../shared/model/Preferences';
import type { Profile }                               from '../../../shared/model/Profile';
import { type IngestionVerdict, ingestionVerdictFor } from '../IngestionVerdict';

const LOWEST_CONFIRMATION_YEAR = 1900;
const HIGHEST_CONFIRMATION_YEAR = 9999;
const ROWS_NEEDED_TO_DETECT_A_SECOND_CUSTOMER = 2;

function flagFrom(reader: RecordReader, key: string): boolean {
  return reader.integer(key, { minimum: 0, maximum: 1 }) === 1;
}

/**
 * Reads the one mock customer's profile, preferences and direct-debit schedule from the store. Every
 * column passes through `RecordReader`, so a value outside its constraint makes the read `invalid`.
 */
export class CustomerIngestion {
  readonly #connection: Database;

  constructor(connection: Database) {
    this.#connection = connection;
  }

  readProfile(): IngestionVerdict<Profile> {
    const rows = this.#connection.query<unknown, []>(`SELECT * FROM customer LIMIT ${ROWS_NEEDED_TO_DETECT_A_SECOND_CUSTOMER}`).all();
    if (rows.length === 0) {
      return { outcome: 'absent' };
    }
    if (rows.length > 1) {
      return { outcome: 'invalid', failedPaths: ['customer'] };
    }
    const reader = new RecordReader({ customer: rows[0] });
    const profile = reader.record('customer', (customerReader): Profile => ({
      customerNumber:                customerReader.nonEmptyString('customer_number'),
      fullName:                      customerReader.nonEmptyString('full_name'),
      firstName:                     customerReader.nonEmptyString('first_name'),
      initials:                      customerReader.nonEmptyString('initials'),
      birthDate:                     customerReader.calendarDate('birth_date'),
      emailAddress:                  customerReader.nonEmptyString('email_address'),
      emailAddressNeedsConfirmation: flagFrom(customerReader, 'email_address_needs_confirmation'),
      emailAddressLastConfirmedYear: customerReader.integer('email_address_last_confirmed_year', { minimum: LOWEST_CONFIRMATION_YEAR, maximum: HIGHEST_CONFIRMATION_YEAR }),
      phoneNumber:                   customerReader.nonEmptyString('phone_number'),
      address:                       {
        streetAndHouseNumber: customerReader.nonEmptyString('street_and_house_number'),
        postcode:             customerReader.nonEmptyString('postcode'),
        city:                 customerReader.nonEmptyString('city'),
      },
      iban:          customerReader.nonEmptyString('iban'),
      paymentMethod: customerReader.oneOf('payment_method', ['monthlyDirectDebit']),
      accountHolder: customerReader.nonEmptyString('account_holder'),
    }));
    return ingestionVerdictFor(reader.verdictFor(profile));
  }

  readPreferences(): IngestionVerdict<Preferences> {
    const row = this.#connection.query<unknown, []>('SELECT * FROM preferences').get();
    if (row === null) {
      return { outcome: 'absent' };
    }
    const reader = new RecordReader({ preferences: row });
    const preferences = reader.record('preferences', (preferencesReader): Preferences => ({
      paperMail:               flagFrom(preferencesReader, 'paper_mail'),
      newsletter:              flagFrom(preferencesReader, 'newsletter'),
      claimUpdateTextMessages: flagFrom(preferencesReader, 'claim_update_text_messages'),
    }));
    return ingestionVerdictFor(reader.verdictFor(preferences));
  }

  /** `absent` means nothing is scheduled, which the next-payment read answers with `null`. */
  readDirectDebitSchedule(): IngestionVerdict<DirectDebitSchedule> {
    const row = this.#connection.query<unknown, []>('SELECT * FROM direct_debit_schedule').get();
    if (row === null) {
      return { outcome: 'absent' };
    }
    const reader = new RecordReader({ direct_debit_schedule: row });
    const schedule = reader.record('direct_debit_schedule', (scheduleReader): DirectDebitSchedule => {
      const nextCollectionDate = scheduleReader.calendarDate('next_collection_date');
      return { nextCollectionDate };
    });
    return ingestionVerdictFor(reader.verdictFor(schedule));
  }
}
