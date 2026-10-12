/**
 * Dutch display formats for values that were validated at their boundary. A malformed value is a
 * programming error, so it throws a RangeError as `Intl` does rather than printing a guess.
 */
export type MonthStyle = 'short' | 'long';

const SHORT_MONTH_NAMES = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'] as const;
const LONG_MONTH_NAMES = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'] as const;
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;
const CUSTOMER_NUMBER_PATTERN = /^(\d{2})(\d{3})(\d{3})$/;
const CENTS_PER_EURO = 100;

interface DateParts {
  readonly day:         number;
  readonly monthNumber: number;
  readonly year:        string;
}

function datePartsFor(isoDate: string): DateParts {
  const match = CALENDAR_DATE_PATTERN.exec(isoDate);
  if (match === null) {
    throw new RangeError(`Expected a calendar date as YYYY-MM-DD, got "${isoDate}".`);
  }
  const [, year = '', monthText = '', dayText = ''] = match;
  return { day: Number(dayText), monthNumber: Number(monthText), year };
}

function monthNameFor(monthNumber: number, monthStyle: MonthStyle): string {
  const monthNames = monthStyle === 'short' ? SHORT_MONTH_NAMES : LONG_MONTH_NAMES;
  const monthName = monthNames[monthNumber - 1];
  if (monthName === undefined) {
    throw new RangeError(`Expected a month from 1 to 12, got ${monthNumber}.`);
  }
  return monthName;
}

function longDateFor(isoDate: string): string {
  const { day, monthNumber, year } = datePartsFor(isoDate);
  return `${day} ${monthNameFor(monthNumber, 'long')} ${year}`;
}

export const DutchFormat = {
  money: (cents: number): string => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / CENTS_PER_EURO),

  longDate: longDateFor,

  shortDate: (isoDate: string): string => {
    const { day, monthNumber, year } = datePartsFor(isoDate);
    return `${day} ${monthNameFor(monthNumber, 'short')} ${year}`;
  },

  monthYear: (isoDate: string, monthStyle: MonthStyle): string => {
    const { monthNumber, year } = datePartsFor(isoDate);
    return `${monthNameFor(monthNumber, monthStyle)} ${year}`;
  },

  dayMonth: (isoDate: string): string => {
    const { day, monthNumber } = datePartsFor(isoDate);
    return `${day} ${monthNameFor(monthNumber, 'short')}`;
  },

  dateAndTime: (isoDateTime: string): string => {
    const match = LOCAL_DATE_TIME_PATTERN.exec(isoDateTime);
    if (match === null) {
      throw new RangeError(`Expected a local date and time as YYYY-MM-DDTHH:MM, got "${isoDateTime}".`);
    }
    const [, isoDate = '', time = ''] = match;
    return `${longDateFor(isoDate)}, ${time}`;
  },

  customerNumber: (digits: string): string => {
    const match = CUSTOMER_NUMBER_PATTERN.exec(digits);
    if (match === null) {
      throw new RangeError(`Expected a customer number of eight digits, got "${digits}".`);
    }
    const [, firstGroup = '', secondGroup = '', thirdGroup = ''] = match;
    return `${firstGroup} ${secondGroup} ${thirdGroup}`;
  },
} as const;
