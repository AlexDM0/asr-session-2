import type { ReadVerdict }   from '../../lib/resource/ReadVerdict';
import type { ClaimSummary }  from '../../shared/model/Claim';
import type { PolicySummary } from '../../shared/model/Policy';
import type { Profile }       from '../../shared/model/Profile';

import type { HeroSourceLoaders, HeroSourceValues } from './heroSourceLoaders';

export const EXAMPLE_PROFILE: Profile = {
  customerNumber:                '99000001',
  fullName:                      'Alex Example',
  firstName:                     'Alex',
  initials:                      'AE',
  birthDate:                     '2000-01-01',
  emailAddress:                  'alex@example.test',
  emailAddressNeedsConfirmation: true,
  emailAddressLastConfirmedYear: 2091,
  phoneNumber:                   '0600000000',
  address:                       { streetAndHouseNumber: 'Examplestraat 1', postcode: '9999 ZZ', city: 'Exampledorp' },
  iban:                          'NL00EXAM0000000001',
  paymentMethod:                 'monthlyDirectDebit',
  accountHolder:                 'A. Example',
};

function examplePolicy(id: string, overrides: Partial<PolicySummary>): PolicySummary {
  return {
    id,
    policyNumber:        `${id}-NUMBER`,
    kind:                'home',
    name:                `Example policy ${id}`,
    subtitle:            `Example subtitle ${id}`,
    monthlyPremiumCents: 1234,
    status:              'active',
    ...overrides,
  };
}

/** Three active policies around one ended one, so the ended one visibly does not count. */
export const EXAMPLE_POLICIES: readonly PolicySummary[] = [
  examplePolicy('EX-POLICY-1', { kind: 'home' }),
  examplePolicy('EX-POLICY-2', { kind: 'car', status: 'ended' }),
  examplePolicy('EX-POLICY-3', { kind: 'car' }),
  examplePolicy('EX-POLICY-4', { kind: 'liability' }),
];

export function exampleClaim(id: string, overrides: Partial<ClaimSummary>): ClaimSummary {
  return {
    id,
    title:                `Example claim ${id}`,
    category:             'home',
    policyId:             'EX-POLICY-1',
    policyName:           'Example home policy',
    reportedAt:           '2099-01-01T09:00',
    status:               'inProgress',
    handlerName:          null,
    stepStates:           ['done', 'done', 'current', 'todo'],
    awaitsCustomerPhotos: false,
    ...overrides,
  };
}

/** Two open claims (one in progress, one reported) and two closed ones, one per closed status. */
export const EXAMPLE_CLAIMS: readonly ClaimSummary[] = [
  exampleClaim('EX-CLAIM-1', { status: 'paidOut', stepStates: ['done', 'done', 'done', 'done'] }),
  exampleClaim('EX-CLAIM-2', { status: 'inProgress' }),
  exampleClaim('EX-CLAIM-3', { status: 'reported', stepStates: ['done', 'todo', 'todo', 'todo'] }),
  exampleClaim('EX-CLAIM-4', { status: 'rejected' }),
];

export const EXAMPLE_SOURCE_VALUES: HeroSourceValues = {
  profile:  EXAMPLE_PROFILE,
  policies: EXAMPLE_POLICIES,
  claims:   EXAMPLE_CLAIMS,
};

export const EXAMPLE_FAILURE = { outcome: 'failed', reason: 'Example failure.' } as const;

export interface ControllableSource<Value> {
  readonly load:          (signal: AbortSignal) => Promise<ReadVerdict<Value>>;
  readonly callCount:     () => number;
  /** Answers every read of this source that is still pending. */
  readonly answerPending: (verdict: ReadVerdict<Value>) => void;
}

export type ControllableSources = {
  readonly [Source in keyof HeroSourceValues]: ControllableSource<HeroSourceValues[Source]>;
};

/** Answers per call, in order; a call without a scripted answer stays pending until `answerPending`. */
export type HeroAnswerScripts = {
  readonly [Source in keyof HeroSourceValues]?: readonly ReadVerdict<HeroSourceValues[Source]>[];
};

function controllableSource<Value>(answerScript: readonly ReadVerdict<Value>[] = []): ControllableSource<Value> {
  let callCount = 0;
  const pendingAnswers: ((verdict: ReadVerdict<Value>) => void)[] = [];
  return {
    load: () => {
      const scriptedAnswer = answerScript[callCount];
      callCount += 1;
      if (scriptedAnswer !== undefined) {
        return Promise.resolve(scriptedAnswer);
      }
      return new Promise((resolve) => {
        pendingAnswers.push(resolve);
      });
    },
    callCount:     () => callCount,
    answerPending: (verdict) => {
      for (const answer of pendingAnswers.splice(0)) {
        answer(verdict);
      }
    },
  };
}

export function foundAnswer<Value>(value: Value): ReadVerdict<Value> {
  return { outcome: 'found', value };
}

/** Every source answers its first read with the example values. */
export function foundAnswerScripts(values: HeroSourceValues = EXAMPLE_SOURCE_VALUES): HeroAnswerScripts {
  return {
    profile:  [foundAnswer(values.profile)],
    policies: [foundAnswer(values.policies)],
    claims:   [foundAnswer(values.claims)],
  };
}

export function controllableHeroSources(answerScripts: HeroAnswerScripts = {}): {
  readonly sources:       ControllableSources;
  readonly sourceLoaders: HeroSourceLoaders;
} {
  const sources: ControllableSources = {
    profile:  controllableSource(answerScripts.profile),
    policies: controllableSource(answerScripts.policies),
    claims:   controllableSource(answerScripts.claims),
  };
  const sourceLoaders: HeroSourceLoaders = {
    profile:  sources.profile.load,
    policies: sources.policies.load,
    claims:   sources.claims.load,
  };
  return { sources, sourceLoaders };
}
