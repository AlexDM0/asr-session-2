/**
 * The vocabulary is the seed boundary for the Dutch enumerations. What matters is that every
 * row of the mapping table lands on its English internal value, and that anything else, including a
 * name inherited from Object.prototype, is refused with a message naming the field and the value.
 */
import { describe, expect, it } from 'bun:test';

import { SeedVocabularyUtil } from './SeedVocabularyUtil';

describe('SeedVocabularyUtil', () => {
  it('maps every Dutch policy type to its internal kind', () => {
    expect(SeedVocabularyUtil.policyKindFor('woonhuis')).toEqual({ outcome: 'known', value: 'home' });
    expect(SeedVocabularyUtil.policyKindFor('inboedel')).toEqual({ outcome: 'known', value: 'contents' });
    expect(SeedVocabularyUtil.policyKindFor('auto')).toEqual({ outcome: 'known', value: 'car' });
    expect(SeedVocabularyUtil.policyKindFor('aansprakelijkheid')).toEqual({ outcome: 'known', value: 'liability' });
  });

  it('maps both Dutch policy statuses to their internal values', () => {
    expect(SeedVocabularyUtil.policyStatusFor('actief')).toEqual({ outcome: 'known', value: 'active' });
    expect(SeedVocabularyUtil.policyStatusFor('beeindigd')).toEqual({ outcome: 'known', value: 'ended' });
  });

  it('maps every Dutch claim status to its internal value', () => {
    expect(SeedVocabularyUtil.claimStatusFor('gemeld')).toEqual({ outcome: 'known', value: 'reported' });
    expect(SeedVocabularyUtil.claimStatusFor('in_behandeling')).toEqual({ outcome: 'known', value: 'inProgress' });
    expect(SeedVocabularyUtil.claimStatusFor('uitbetaald')).toEqual({ outcome: 'known', value: 'paidOut' });
    expect(SeedVocabularyUtil.claimStatusFor('afgewezen')).toEqual({ outcome: 'known', value: 'rejected' });
  });

  it('maps every claim-flow category slug to its internal category', () => {
    expect(SeedVocabularyUtil.claimCategoryFor('huis')).toEqual({ outcome: 'known', value: 'home' });
    expect(SeedVocabularyUtil.claimCategoryFor('auto')).toEqual({ outcome: 'known', value: 'car' });
    expect(SeedVocabularyUtil.claimCategoryFor('reis')).toEqual({ outcome: 'known', value: 'travel' });
    expect(SeedVocabularyUtil.claimCategoryFor('ander')).toEqual({ outcome: 'known', value: 'liability' });
  });

  it('maps the step states to themselves', () => {
    for (const stepState of ['done', 'current', 'todo'] as const) {
      expect(SeedVocabularyUtil.claimStepStateFor(stepState)).toEqual({ outcome: 'known', value: stepState });
    }
  });

  it('maps the Dutch payment method to monthlyDirectDebit', () => {
    expect(SeedVocabularyUtil.paymentMethodFor('automatische incasso maandelijks')).toEqual({ outcome: 'known', value: 'monthlyDirectDebit' });
  });

  it('refuses an unknown value with an English message naming the field and the value', () => {
    expect(SeedVocabularyUtil.claimStatusFor('example-status')).toEqual({
      outcome: 'unknown',
      problem: 'The seed field claim status has the unknown value "example-status".',
    });
  });

  it('refuses an internal value where the Dutch seed value is expected', () => {
    expect(SeedVocabularyUtil.policyKindFor('home').outcome).toBe('unknown');
    expect(SeedVocabularyUtil.claimStatusFor('inProgress').outcome).toBe('unknown');
  });

  it('refuses a property name inherited from Object.prototype such as toString', () => {
    expect(SeedVocabularyUtil.policyKindFor('toString').outcome).toBe('unknown');
    expect(SeedVocabularyUtil.claimStepStateFor('constructor').outcome).toBe('unknown');
    expect(SeedVocabularyUtil.paymentMethodFor('__proto__').outcome).toBe('unknown');
  });
});
