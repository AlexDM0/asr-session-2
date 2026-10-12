/**
 * Pins the Dutch display formats every screen shows. The cases that matter are the ones a locale
 * formatter gets wrong for this design: abbreviated months without a full stop ("mrt", "okt"), lower
 * case month names, the no-break space after the euro sign and the 2-3-3 customer number grouping.
 */
import { describe, expect, it } from 'bun:test';

import { DutchFormat } from './DutchFormat';

const NO_BREAK_SPACE = ' ';

const MONTH_NAMES_BY_NUMBER = [
  { month: '01', shortName: 'jan', longName: 'januari' },
  { month: '02', shortName: 'feb', longName: 'februari' },
  { month: '03', shortName: 'mrt', longName: 'maart' },
  { month: '04', shortName: 'apr', longName: 'april' },
  { month: '05', shortName: 'mei', longName: 'mei' },
  { month: '06', shortName: 'jun', longName: 'juni' },
  { month: '07', shortName: 'jul', longName: 'juli' },
  { month: '08', shortName: 'aug', longName: 'augustus' },
  { month: '09', shortName: 'sep', longName: 'september' },
  { month: '10', shortName: 'okt', longName: 'oktober' },
  { month: '11', shortName: 'nov', longName: 'november' },
  { month: '12', shortName: 'dec', longName: 'december' },
] as const;

describe('DutchFormat.money', () => {
  it('writes euro cents with a no-break space after the euro sign, a full stop per thousand and a decimal comma', () => {
    expect(DutchFormat.money(123456)).toBe(`€${NO_BREAK_SPACE}1.234,56`);
  });

  it('writes an amount below one euro with a leading zero and two decimals', () => {
    expect(DutchFormat.money(5)).toBe(`€${NO_BREAK_SPACE}0,05`);
  });

  it('writes whole euros with two zero decimals', () => {
    expect(DutchFormat.money(1000)).toBe(`€${NO_BREAK_SPACE}10,00`);
  });
});

describe('DutchFormat dates', () => {
  it('writes a long date as day, full lower-case month and year', () => {
    expect(DutchFormat.longDate('2099-01-02')).toBe('2 januari 2099');
  });

  it('writes a short date with the mrt abbreviation for maart', () => {
    expect(DutchFormat.shortDate('2099-03-04')).toBe('4 mrt 2099');
  });

  it('writes a month and year in the short or the long month style', () => {
    expect(DutchFormat.monthYear('2099-10-20', 'short')).toBe('okt 2099');
    expect(DutchFormat.monthYear('2099-10-20', 'long')).toBe('oktober 2099');
  });

  it('writes a day and month without the year', () => {
    expect(DutchFormat.dayMonth('2099-12-31')).toBe('31 dec');
  });

  it('writes a date and time as the long date, a comma and the 24-hour time', () => {
    expect(DutchFormat.dateAndTime('2099-01-02T07:05')).toBe('2 januari 2099, 07:05');
  });

  it('uses the lower-case name and abbreviation of all twelve months, never with a trailing full stop', () => {
    for (const { month, shortName, longName } of MONTH_NAMES_BY_NUMBER) {
      const isoDate = `2099-${month}-15`;

      expect(DutchFormat.shortDate(isoDate)).toBe(`15 ${shortName} 2099`);
      expect(DutchFormat.dayMonth(isoDate)).toBe(`15 ${shortName}`);
      expect(DutchFormat.longDate(isoDate)).toBe(`15 ${longName} 2099`);
      expect(DutchFormat.monthYear(isoDate, 'short')).toBe(`${shortName} 2099`);
      expect(DutchFormat.monthYear(isoDate, 'long')).toBe(`${longName} 2099`);
    }
  });

  it('refuses a value that is not a calendar date instead of guessing', () => {
    expect(() => DutchFormat.longDate('2099-13-01')).toThrow(RangeError);
    expect(() => DutchFormat.shortDate('not a date')).toThrow(RangeError);
    expect(() => DutchFormat.dateAndTime('2099-01-02')).toThrow(RangeError);
  });
});

describe('DutchFormat.customerNumber', () => {
  it('groups eight digits as two, three and three', () => {
    expect(DutchFormat.customerNumber('12345678')).toBe('12 345 678');
  });

  it('refuses a value that is not eight digits instead of guessing', () => {
    expect(() => DutchFormat.customerNumber('1234567')).toThrow(RangeError);
  });
});
