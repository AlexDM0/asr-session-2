import { readFile } from 'node:fs/promises';
import { resolve }  from 'node:path';

import { RecordReader } from '@mijn-duinzicht/record-reader/RecordReader';

import type { Claim, ClaimStep }    from '../../shared/model/Claim';
import type { DirectDebitSchedule } from '../../shared/model/DirectDebitSchedule';
import type { Message }             from '../../shared/model/Message';
import type { Policy }              from '../../shared/model/Policy';
import type { PortalSeed }          from '../../shared/model/PortalSeed';
import type { Preferences }         from '../../shared/model/Preferences';
import type { Profile }             from '../../shared/model/Profile';

import { SeedVocabularyUtil, type VocabularyVerdict } from './SeedVocabularyUtil';

export type SeedVerdict =
  | { readonly outcome: 'valid'; readonly seed: PortalSeed }
  | { readonly outcome: 'invalid'; readonly problems: readonly string[] };

const SUPPORTED_SEED_FORMAT_VERSION = 1;
const DECIMAL_EUROS_PATTERN = /^(\d+)\.(\d{2})$/;
const CENTS_PER_EURO = 100;
const LOWEST_CONFIRMATION_YEAR = 1900;
const HIGHEST_CONFIRMATION_YEAR = 9999;

/** The seed shipped with the API, resolved from this module's own directory so every worktree reads its own copy. */
export function bundledSeedPath(): string {
  return resolve(import.meta.dir, '..', '..', '..', 'resources', 'seed.json');
}

/**
 * Reads the seed file: read → validate with `RecordReader` → check the format version → map the
 * seed's Dutch enumerations and decimal euro amounts into the internal model.
 */
export class SeedIngestion {
  readonly #seedPath: string;

  #problems: string[] = [];

  constructor(seedPath: string) {
    this.#seedPath = seedPath;
  }

  async read(): Promise<SeedVerdict> {
    this.#problems = [];
    let document: unknown;
    try {
      document = JSON.parse(await readFile(this.#seedPath, 'utf8'));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { outcome: 'invalid', problems: [`The seed file ${this.#seedPath} cannot be read as JSON: ${reason}`] };
    }

    const reader = new RecordReader(document);
    const formatVersion = reader.integer('formatVersion');
    if (reader.verdictFor(null).outcome === 'valid' && formatVersion !== SUPPORTED_SEED_FORMAT_VERSION) {
      return {
        outcome:  'invalid',
        problems: [`The seed file has format version ${formatVersion}, but only version ${SUPPORTED_SEED_FORMAT_VERSION} is supported.`],
      };
    }

    const seed: PortalSeed = {
      customer:            reader.record('customer', (customerReader) => this.#profileFrom(customerReader)),
      preferences:         reader.record('preferences', (preferencesReader) => SeedIngestion.#preferencesFrom(preferencesReader)),
      directDebitSchedule: reader.nullable('directDebitSchedule', (scheduleReader, key) => scheduleReader.record(key, SeedIngestion.#directDebitScheduleFrom)),
      policies:            reader.array('policies', (policiesReader, index) => policiesReader.record(index, (policyReader) => this.#policyFrom(policyReader, index))),
      claims:              reader.array('claims', (claimsReader, index) => claimsReader.record(index, (claimReader) => this.#claimFrom(claimReader, index))),
      messages:            reader.array('messages', (messagesReader, index) => messagesReader.record(index, (messageReader) => SeedIngestion.#messageFrom(messageReader))),
    };

    const verdict = reader.verdictFor(seed);
    const problems = [
      ...(verdict.outcome === 'invalid' ? verdict.failedPaths.map((failedPath) => `The seed field ${failedPath} is missing or malformed.`) : []),
      ...this.#problems,
    ];
    if (problems.length > 0) {
      return { outcome: 'invalid', problems };
    }
    return { outcome: 'valid', seed };
  }

  #profileFrom(customerReader: RecordReader): Profile {
    return {
      customerNumber:                customerReader.nonEmptyString('customerNumber'),
      fullName:                      customerReader.nonEmptyString('fullName'),
      firstName:                     customerReader.nonEmptyString('firstName'),
      initials:                      customerReader.nonEmptyString('initials'),
      birthDate:                     customerReader.calendarDate('birthDate'),
      emailAddress:                  customerReader.nonEmptyString('emailAddress'),
      emailAddressNeedsConfirmation: customerReader.boolean('emailAddressNeedsConfirmation'),
      emailAddressLastConfirmedYear: customerReader.integer('emailAddressLastConfirmedYear', { minimum: LOWEST_CONFIRMATION_YEAR, maximum: HIGHEST_CONFIRMATION_YEAR }),
      phoneNumber:                   customerReader.nonEmptyString('phoneNumber'),
      address:                       customerReader.record('address', (addressReader) => ({
        streetAndHouseNumber: addressReader.nonEmptyString('streetAndHouseNumber'),
        postcode:             addressReader.nonEmptyString('postcode'),
        city:                 addressReader.nonEmptyString('city'),
      })),
      iban:          customerReader.nonEmptyString('iban'),
      paymentMethod: this.#internalValue(SeedVocabularyUtil.paymentMethodFor(customerReader.string('paymentMethod')), 'customer.paymentMethod', 'monthlyDirectDebit'),
      accountHolder: customerReader.nonEmptyString('accountHolder'),
    };
  }

  static #preferencesFrom(preferencesReader: RecordReader): Preferences {
    return {
      paperMail:               preferencesReader.boolean('paperMail'),
      newsletter:              preferencesReader.boolean('newsletter'),
      claimUpdateTextMessages: preferencesReader.boolean('claimUpdateTextMessages'),
    };
  }

  #policyFrom(policyReader: RecordReader, index: number): Policy {
    const path = `policies[${index}]`;
    return {
      id:                  policyReader.nonEmptyString('id'),
      kind:                this.#internalValue(SeedVocabularyUtil.policyKindFor(policyReader.string('type')), `${path}.type`, 'home'),
      name:                policyReader.nonEmptyString('name'),
      subtitle:            policyReader.nonEmptyString('subtitle'),
      monthlyPremiumCents: this.#centsFrom(policyReader.string('monthlyPremiumEuros'), `${path}.monthlyPremiumEuros`),
      status:              this.#internalValue(SeedVocabularyUtil.policyStatusFor(policyReader.string('status')), `${path}.status`, 'active'),
      facts:               policyReader.array('facts', (factsReader, factIndex) => factsReader.record(factIndex, (factReader) => ({
        label: factReader.nonEmptyString('label'),
        value: factReader.nonEmptyString('value'),
      }))),
      coverage: policyReader.array('coverage', (coverageReader, itemIndex) => coverageReader.nonEmptyString(itemIndex)),
    };
  }

  #claimFrom(claimReader: RecordReader, index: number): Claim {
    const path = `claims[${index}]`;
    return {
      id:            claimReader.nonEmptyString('id'),
      title:         claimReader.nonEmptyString('title'),
      category:      this.#internalValue(SeedVocabularyUtil.claimCategoryFor(claimReader.string('category')), `${path}.category`, 'home'),
      policyId:      claimReader.nonEmptyString('policyId'),
      reportedAt:    claimReader.localDateTime('reportedAt'),
      status:        this.#internalValue(SeedVocabularyUtil.claimStatusFor(claimReader.string('status')), `${path}.status`, 'reported'),
      handlerName:   claimReader.nullable('handlerName', (handlerReader, key) => handlerReader.nonEmptyString(key)),
      incidentDate:  null,
      description:   null,
      photoDeadline: claimReader.nullable('photoDeadline', (deadlineReader, key) => deadlineReader.calendarDate(key)),
      steps:         claimReader.array('steps', (stepsReader, stepIndex) => stepsReader.record(
        stepIndex,
        (stepReader) => this.#claimStepFrom(stepReader, `${path}.steps[${stepIndex}]`),
      )),
    };
  }

  #claimStepFrom(stepReader: RecordReader, path: string): ClaimStep {
    return {
      title:          stepReader.nonEmptyString('title'),
      description:    stepReader.string('description'),
      state:          this.#internalValue(SeedVocabularyUtil.claimStepStateFor(stepReader.string('state')), `${path}.state`, 'todo'),
      waitsForPhotos: stepReader.boolean('waitsForPhotos'),
    };
  }

  static #directDebitScheduleFrom(this: void, scheduleReader: RecordReader): DirectDebitSchedule {
    return { nextCollectionDate: scheduleReader.calendarDate('nextCollectionDate') };
  }

  static #messageFrom(messageReader: RecordReader): Message {
    return {
      id:     messageReader.nonEmptyString('id'),
      title:  messageReader.nonEmptyString('title'),
      sentOn: messageReader.calendarDate('sentOn'),
      isRead: messageReader.boolean('isRead'),
      body:   messageReader.string('body'),
    };
  }

  #internalValue<InternalValue>(verdict: VocabularyVerdict<InternalValue>, path: string, placeholder: InternalValue): InternalValue {
    if (verdict.outcome === 'known') {
      return verdict.value;
    }
    this.#problems.push(`${verdict.problem} (${path})`);
    return placeholder;
  }

  #centsFrom(decimalEuros: string, path: string): number {
    const match = DECIMAL_EUROS_PATTERN.exec(decimalEuros);
    if (match === null) {
      this.#problems.push(`The seed field ${path} must be a decimal euro amount such as "12.30", but is "${decimalEuros}".`);
      return 0;
    }
    const [, wholeEuros = '', cents = ''] = match;
    return Number(wholeEuros) * CENTS_PER_EURO + Number(cents);
  }
}
