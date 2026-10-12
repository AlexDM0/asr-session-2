/**
 * The reader is the fail-closed gate for every untrusted value, so the cases that matter are the
 * refusals: wrong types, values outside a range or a union, impossible calendar dates, and that every
 * failing path is collected without a throw, so one malformed answer reports all of its problems.
 */
import { describe, expect, it } from 'bun:test';

import { RecordReader } from './RecordReader';

describe('RecordReader', () => {
  it('reads a string field and returns a valid verdict with the mapped value', () => {
    const reader = new RecordReader({ title: 'Example title' });

    const value = { title: reader.string('title') };

    expect(reader.verdictFor(value)).toEqual({ outcome: 'valid', value: { title: 'Example title' } });
  });

  it('refuses a number where a string is expected', () => {
    const reader = new RecordReader({ title: 42 });

    reader.string('title');

    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['title'] });
  });

  it('refuses an empty text where a non-empty string is expected but accepts it as a plain string', () => {
    const reader = new RecordReader({ name: '' });

    expect(reader.string('name')).toBe('');
    expect(reader.verdictFor(null).outcome).toBe('valid');
    reader.nonEmptyString('name');
    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['name'] });
  });

  it('reads an integer within its range', () => {
    const reader = new RecordReader({ count: 7 });

    expect(reader.integer('count', { minimum: 1, maximum: 9 })).toBe(7);
    expect(reader.verdictFor(null).outcome).toBe('valid');
  });

  it('refuses a fractional number, a numeric text and an integer outside its range', () => {
    const reader = new RecordReader({
      fraction: 1.5,
      text:     '3',
      tooLow:   0,
      tooHigh:  10,
    });

    reader.integer('fraction');
    reader.integer('text');
    reader.integer('tooLow', { minimum: 1 });
    reader.integer('tooHigh', { maximum: 9 });

    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['fraction', 'text', 'tooLow', 'tooHigh'] });
  });

  it('reads booleans and refuses the numbers 0 and 1 as booleans', () => {
    const reader = new RecordReader({
      isOn:       true,
      isOff:      false,
      numericOn:  1,
      numericOff: 0,
    });

    expect(reader.boolean('isOn')).toBe(true);
    expect(reader.boolean('isOff')).toBe(false);
    reader.boolean('numericOn');
    reader.boolean('numericOff');

    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['numericOn', 'numericOff'] });
  });

  it('returns null for a nullable field holding null and reads the present value otherwise', () => {
    const reader = new RecordReader({ absentNote: null, presentNote: 'Example note' });

    expect(reader.nullable('absentNote', (nullableReader, key) => nullableReader.string(key))).toBeNull();
    expect(reader.nullable('presentNote', (nullableReader, key) => nullableReader.string(key))).toBe('Example note');
    expect(reader.verdictFor(null).outcome).toBe('valid');
  });

  it('refuses a missing field even when it is nullable, because an absent value is null and never omitted', () => {
    const reader = new RecordReader({});

    reader.nullable('missingNote', (nullableReader, key) => nullableReader.string(key));

    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['missingNote'] });
  });

  it('accepts only the listed values of a string-literal union, matched exactly', () => {
    const reader = new RecordReader({ known: 'second', unknown: 'third', differentCase: 'First' });

    expect(reader.oneOf('known', ['first', 'second'])).toBe('second');
    reader.oneOf('unknown', ['first', 'second']);
    reader.oneOf('differentCase', ['first', 'second']);

    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['unknown', 'differentCase'] });
  });

  it('accepts a leap day in a leap year as a calendar date', () => {
    const reader = new RecordReader({ leapDay: '2096-02-29', centuryLeapDay: '2000-02-29' });

    expect(reader.calendarDate('leapDay')).toBe('2096-02-29');
    expect(reader.calendarDate('centuryLeapDay')).toBe('2000-02-29');
    expect(reader.verdictFor(null).outcome).toBe('valid');
  });

  it('refuses 2026-02-30 as a calendar date', () => {
    const reader = new RecordReader({ impossibleDate: '2026-02-30' });

    reader.calendarDate('impossibleDate');

    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['impossibleDate'] });
  });

  it('refuses a leap day outside a leap year, a thirteenth month, a missing zero and a trailing time', () => {
    const reader = new RecordReader({
      commonYearLeapDay: '2099-02-29',
      centuryLeapDay:    '2100-02-29',
      thirteenthMonth:   '2099-13-01',
      dayThirtyOne:      '2099-04-31',
      missingZero:       '2099-1-02',
      withTime:          '2099-01-02T10:00',
    });

    reader.calendarDate('commonYearLeapDay');
    reader.calendarDate('centuryLeapDay');
    reader.calendarDate('thirteenthMonth');
    reader.calendarDate('dayThirtyOne');
    reader.calendarDate('missingZero');
    reader.calendarDate('withTime');

    expect(reader.verdictFor(null)).toEqual({
      outcome:     'invalid',
      failedPaths: ['commonYearLeapDay', 'centuryLeapDay', 'thirteenthMonth', 'dayThirtyOne', 'missingZero', 'withTime'],
    });
  });

  it('reads a local date and time to the minute', () => {
    const reader = new RecordReader({ startedAt: '2099-12-31T23:59' });

    expect(reader.localDateTime('startedAt')).toBe('2099-12-31T23:59');
    expect(reader.verdictFor(null).outcome).toBe('valid');
  });

  it('refuses a local date and time with hour 24, minute 60, seconds, a zone or an impossible date', () => {
    const reader = new RecordReader({
      hourTwentyFour: '2099-01-02T24:00',
      minuteSixty:    '2099-01-02T10:60',
      withSeconds:    '2099-01-02T10:00:00',
      withZone:       '2099-01-02T10:00Z',
      impossibleDate: '2099-02-30T10:00',
    });

    reader.localDateTime('hourTwentyFour');
    reader.localDateTime('minuteSixty');
    reader.localDateTime('withSeconds');
    reader.localDateTime('withZone');
    reader.localDateTime('impossibleDate');

    expect(reader.verdictFor(null)).toEqual({
      outcome:     'invalid',
      failedPaths: ['hourTwentyFour', 'minuteSixty', 'withSeconds', 'withZone', 'impossibleDate'],
    });
  });

  it('reads every element of an array and records the index of a failing element', () => {
    const reader = new RecordReader({ labels: ['first example', 7, 'third example'] });

    const labels = reader.array('labels', (elementsReader, index) => elementsReader.string(index));

    expect(labels).toEqual(['first example', '', 'third example']);
    expect(reader.verdictFor(labels)).toEqual({ outcome: 'invalid', failedPaths: ['labels[1]'] });
  });

  it('refuses a value that is not an array where an array is expected', () => {
    const reader = new RecordReader({ labels: { first: 'not a list' } });

    expect(reader.array('labels', (elementsReader, index) => elementsReader.string(index))).toEqual([]);
    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['labels'] });
  });

  it('reads nested records and records the full path of a failing field inside them', () => {
    const reader = new RecordReader({
      owner: { name: 'Alex Example', address: { city: 'Example City', postcode: 1234 } },
      steps: [{ title: 'First step' }, { title: null }],
    });

    const owner = reader.record('owner', (ownerReader) => ({
      name:    ownerReader.string('name'),
      address: ownerReader.record('address', (addressReader) => ({ city: addressReader.string('city'), postcode: addressReader.string('postcode') })),
    }));
    reader.array('steps', (stepsReader, index) => stepsReader.record(index, (stepReader) => ({ title: stepReader.string('title') })));

    expect(owner.address.city).toBe('Example City');
    expect(reader.verdictFor(owner)).toEqual({ outcome: 'invalid', failedPaths: ['owner.address.postcode', 'steps[1].title'] });
  });

  it('records the path of every failing field instead of stopping at the first', () => {
    const reader = new RecordReader({
      title:    1,
      count:    'many',
      isActive: 'yes',
      kind:     'other',
    });

    reader.string('title');
    reader.integer('count');
    reader.boolean('isActive');
    reader.oneOf('kind', ['first', 'second']);

    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['title', 'count', 'isActive', 'kind'] });
  });

  it('never throws on a value that is not a record and reports each field read from it', () => {
    const reader = new RecordReader('not a record');

    expect(() => reader.string('title')).not.toThrow();
    reader.record('owner', (ownerReader) => ownerReader.string('name'));

    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['title', 'owner.name'] });
  });

  it('ignores an inherited property such as toString instead of reading it as a field', () => {
    const reader = new RecordReader({});

    reader.string('toString');
    reader.nullable('constructor', (nullableReader, key) => nullableReader.string(key));

    expect(reader.verdictFor(null)).toEqual({ outcome: 'invalid', failedPaths: ['toString', 'constructor'] });
  });
});
