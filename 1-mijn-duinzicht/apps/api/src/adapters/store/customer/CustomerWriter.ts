import type { Database } from 'bun:sqlite';

import type { DirectDebitSchedule }                                 from '../../../shared/model/DirectDebitSchedule';
import type { PreferenceName, Preferences, PreferencesUpdate }      from '../../../shared/model/Preferences';
import type { ContactDetailsUpdate, PaymentDetailsUpdate, Profile } from '../../../shared/model/Profile';

type StatementBindings = Record<string, string | number | null>;

export interface CustomerWriter {
  insertProfile(profile: Profile): void;
  insertPreferences(customerNumber: string, preferences: Preferences): void;
  insertDirectDebitSchedule(customerNumber: string, schedule: DirectDebitSchedule): void;
  /** Also marks the e-mail address as confirmed; the year of the last confirmation stays as stored. Returns the changed row count. */
  updateContactDetails(update: ContactDetailsUpdate): number;
  /** Changes only the IBAN and the account holder. Returns the changed row count. */
  updatePaymentDetails(update: PaymentDetailsUpdate): number;
  /** Changes only the preferences present in the update. Returns the changed row count. */
  updatePreferences(update: PreferencesUpdate): number;
}

const PREFERENCE_COLUMNS: Readonly<Record<PreferenceName, string>> = {
  paperMail:               'paper_mail',
  newsletter:              'newsletter',
  claimUpdateTextMessages: 'claim_update_text_messages',
};

function flagFor(value: boolean): number {
  return value ? 1 : 0;
}

export function createCustomerWriter(connection: Database): CustomerWriter {
  return {
    insertProfile(profile) {
      connection.query<never, StatementBindings>(
        `INSERT INTO customer (
          customer_number, full_name, first_name, initials, birth_date, email_address, email_address_needs_confirmation,
          email_address_last_confirmed_year, phone_number, street_and_house_number, postcode, city, iban, payment_method, account_holder
        ) VALUES (
          $customerNumber, $fullName, $firstName, $initials, $birthDate, $emailAddress, $emailAddressNeedsConfirmation,
          $emailAddressLastConfirmedYear, $phoneNumber, $streetAndHouseNumber, $postcode, $city, $iban, $paymentMethod, $accountHolder
        )`,
      ).run({
        customerNumber:                profile.customerNumber,
        fullName:                      profile.fullName,
        firstName:                     profile.firstName,
        initials:                      profile.initials,
        birthDate:                     profile.birthDate,
        emailAddress:                  profile.emailAddress,
        emailAddressNeedsConfirmation: flagFor(profile.emailAddressNeedsConfirmation),
        emailAddressLastConfirmedYear: profile.emailAddressLastConfirmedYear,
        phoneNumber:                   profile.phoneNumber,
        streetAndHouseNumber:          profile.address.streetAndHouseNumber,
        postcode:                      profile.address.postcode,
        city:                          profile.address.city,
        iban:                          profile.iban,
        paymentMethod:                 profile.paymentMethod,
        accountHolder:                 profile.accountHolder,
      });
    },

    insertPreferences(customerNumber, preferences) {
      connection.query<never, StatementBindings>(
        `INSERT INTO preferences (customer_number, paper_mail, newsletter, claim_update_text_messages)
         VALUES ($customerNumber, $paperMail, $newsletter, $claimUpdateTextMessages)`,
      ).run({
        customerNumber,
        paperMail:               flagFor(preferences.paperMail),
        newsletter:              flagFor(preferences.newsletter),
        claimUpdateTextMessages: flagFor(preferences.claimUpdateTextMessages),
      });
    },

    insertDirectDebitSchedule(customerNumber, schedule) {
      connection.query<never, StatementBindings>('INSERT INTO direct_debit_schedule (customer_number, next_collection_date) VALUES ($customerNumber, $nextCollectionDate)')
        .run({ customerNumber, nextCollectionDate: schedule.nextCollectionDate });
    },

    updateContactDetails(update) {
      return connection.query<never, StatementBindings>(
        `UPDATE customer SET
          email_address = $emailAddress, phone_number = $phoneNumber, street_and_house_number = $streetAndHouseNumber,
          postcode = $postcode, city = $city, email_address_needs_confirmation = 0`,
      ).run({
        emailAddress:         update.emailAddress,
        phoneNumber:          update.phoneNumber,
        streetAndHouseNumber: update.streetAndHouseNumber,
        postcode:             update.postcode,
        city:                 update.city,
      }).changes;
    },

    updatePaymentDetails(update) {
      return connection.query<never, StatementBindings>('UPDATE customer SET iban = $iban, account_holder = $accountHolder')
        .run({ iban: update.iban, accountHolder: update.accountHolder }).changes;
    },

    updatePreferences(update) {
      const presentNames = (Object.keys(PREFERENCE_COLUMNS) as PreferenceName[]).filter((name) => update[name] !== undefined);
      if (presentNames.length === 0) {
        return 0;
      }
      const assignments = presentNames.map((name) => `${PREFERENCE_COLUMNS[name]} = $${name}`).join(', ');
      const bindings = Object.fromEntries(presentNames.map((name) => [name, flagFor(update[name] === true)]));
      return connection.query<never, StatementBindings>(`UPDATE preferences SET ${assignments}`).run(bindings).changes;
    },
  };
}
