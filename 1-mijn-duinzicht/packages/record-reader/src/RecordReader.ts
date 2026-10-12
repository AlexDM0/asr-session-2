/**
 * Reads named fields of an untrusted value with their expected types. A field that fails is recorded by
 * its path and a placeholder of the right type is returned, so the caller builds its value in one pass
 * and `verdictFor` decides at the end whether that value may be used.
 */
export type RecordVerdict<Value> =
  | { readonly outcome: 'valid'; readonly value: Value }
  | { readonly outcome: 'invalid'; readonly failedPaths: readonly string[] };

export type FieldKey = string | number;

export interface IntegerRange {
  readonly minimum?: number;
  readonly maximum?: number;
}

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/;
const DAYS_PER_MONTH_IN_COMMON_YEAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const FEBRUARY = 2;
const LAST_HOUR_OF_DAY = 23;
const LAST_MINUTE_OF_HOUR = 59;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  const daysInCommonYear = DAYS_PER_MONTH_IN_COMMON_YEAR[month - 1] ?? 0;
  return month === FEBRUARY && isLeapYear(year) ? daysInCommonYear + 1 : daysInCommonYear;
}

function isCalendarDate(value: string): boolean {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const [, yearText = '', monthText = '', dayText = ''] = match;
  const day = Number(dayText);
  return day >= 1 && day <= daysInMonth(Number(yearText), Number(monthText));
}

function isLocalDateTime(value: string): boolean {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const [, dateText = '', hourText = '', minuteText = ''] = match;
  return isCalendarDate(dateText) && Number(hourText) <= LAST_HOUR_OF_DAY && Number(minuteText) <= LAST_MINUTE_OF_HOUR;
}

function childPathFor(parentPath: string, key: FieldKey): string {
  if (typeof key === 'number') {
    return `${parentPath}[${key}]`;
  }
  return parentPath === '' ? key : `${parentPath}.${key}`;
}

export class RecordReader {
  #container: unknown;

  #path: string;

  #failedPaths: string[];

  constructor(value: unknown) {
    this.#container = value;
    this.#path = '';
    this.#failedPaths = [];
  }

  string(key: FieldKey): string {
    const value = this.#valueAt(key);
    if (typeof value === 'string') {
      return value;
    }
    this.#recordFailure(key);
    return '';
  }

  nonEmptyString(key: FieldKey): string {
    const value = this.#valueAt(key);
    if (typeof value === 'string' && value !== '') {
      return value;
    }
    this.#recordFailure(key);
    return '';
  }

  integer(key: FieldKey, range: IntegerRange = {}): number {
    const value = this.#valueAt(key);
    const minimum = range.minimum ?? Number.MIN_SAFE_INTEGER;
    const maximum = range.maximum ?? Number.MAX_SAFE_INTEGER;
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum) {
      return value;
    }
    this.#recordFailure(key);
    return 0;
  }

  boolean(key: FieldKey): boolean {
    const value = this.#valueAt(key);
    if (typeof value === 'boolean') {
      return value;
    }
    this.#recordFailure(key);
    return false;
  }

  oneOf<const Allowed extends string>(key: FieldKey, allowedValues: readonly [Allowed, ...Allowed[]]): Allowed {
    const value = this.#valueAt(key);
    const allowedValue = allowedValues.find((candidate) => candidate === value);
    if (allowedValue !== undefined) {
      return allowedValue;
    }
    this.#recordFailure(key);
    return allowedValues[0];
  }

  calendarDate(key: FieldKey): string {
    const value = this.#valueAt(key);
    if (typeof value === 'string' && isCalendarDate(value)) {
      return value;
    }
    this.#recordFailure(key);
    return '';
  }

  localDateTime(key: FieldKey): string {
    const value = this.#valueAt(key);
    if (typeof value === 'string' && isLocalDateTime(value)) {
      return value;
    }
    this.#recordFailure(key);
    return '';
  }

  nullable<Value>(key: FieldKey, readPresentValue: (reader: RecordReader, key: FieldKey) => Value): Value | null {
    if (this.#valueAt(key) === null) {
      return null;
    }
    return readPresentValue(this, key);
  }

  record<Value>(key: FieldKey, readRecord: (recordReader: RecordReader) => Value): Value {
    return readRecord(this.#childReaderAt(key));
  }

  array<Element>(key: FieldKey, readElement: (elementsReader: RecordReader, index: number) => Element): Element[] {
    const value = this.#valueAt(key);
    if (!Array.isArray(value)) {
      this.#recordFailure(key);
      return [];
    }
    const elementsReader = this.#childReaderAt(key);
    return Array.from(value.keys(), (index) => readElement(elementsReader, index));
  }

  verdictFor<Value>(value: Value): RecordVerdict<Value> {
    if (this.#failedPaths.length > 0) {
      return { outcome: 'invalid', failedPaths: [...this.#failedPaths] };
    }
    return { outcome: 'valid', value };
  }

  #valueAt(key: FieldKey): unknown {
    const container = this.#container;
    if (typeof container !== 'object' || container === null || !Object.hasOwn(container, key)) {
      return undefined;
    }
    const value: unknown = Reflect.get(container, key);
    return value;
  }

  #recordFailure(key: FieldKey): void {
    this.#failedPaths.push(childPathFor(this.#path, key));
  }

  #childReaderAt(key: FieldKey): RecordReader {
    const childReader = new RecordReader(this.#valueAt(key));
    childReader.#path = childPathFor(this.#path, key);
    childReader.#failedPaths = this.#failedPaths;
    return childReader;
  }
}
