/**
 * "Today" and "now" must be the Amsterdam calendar date and time whatever the server's own zone, so
 * the cases that matter are a UTC instant that is already the next day (and year) in Amsterdam, the
 * summer and winter offsets, both daylight saving change nights, and the exact output shapes.
 */
import { describe, expect, it } from 'bun:test';

import { AmsterdamClockUtil } from './AmsterdamClockUtil';

describe('AmsterdamClockUtil', () => {
  it('gives the next calendar date and year for 23:30 UTC on New Year\'s Eve', () => {
    const instant = new Date('2026-12-31T23:30:00Z');

    expect(AmsterdamClockUtil.localDateAt(instant)).toBe('2027-01-01');
    expect(AmsterdamClockUtil.localDateTimeAt(instant)).toBe('2027-01-01T00:30');
  });

  it('adds two hours in summer', () => {
    expect(AmsterdamClockUtil.localDateTimeAt(new Date('2026-07-15T12:03:00Z'))).toBe('2026-07-15T14:03');
  });

  it('adds one hour in winter', () => {
    expect(AmsterdamClockUtil.localDateTimeAt(new Date('2026-01-15T12:03:00Z'))).toBe('2026-01-15T13:03');
  });

  it('jumps from 01:59 to 03:00 on the night summer time starts', () => {
    expect(AmsterdamClockUtil.localDateTimeAt(new Date('2026-03-29T00:59:00Z'))).toBe('2026-03-29T01:59');
    expect(AmsterdamClockUtil.localDateTimeAt(new Date('2026-03-29T01:00:00Z'))).toBe('2026-03-29T03:00');
  });

  it('repeats the hour from 02:00 on the night summer time ends', () => {
    expect(AmsterdamClockUtil.localDateTimeAt(new Date('2026-10-25T00:30:00Z'))).toBe('2026-10-25T02:30');
    expect(AmsterdamClockUtil.localDateTimeAt(new Date('2026-10-25T01:30:00Z'))).toBe('2026-10-25T02:30');
  });

  it('formats midnight as hour 00, not 24', () => {
    expect(AmsterdamClockUtil.localDateTimeAt(new Date('2026-10-07T22:00:00Z'))).toBe('2026-10-08T00:00');
  });

  it('formats the seconds variant as YYYY-MM-DDTHH:MM:SS', () => {
    expect(AmsterdamClockUtil.localDateTimeWithSecondsAt(new Date('2026-10-08T12:03:07Z'))).toBe('2026-10-08T14:03:07');
  });
});
