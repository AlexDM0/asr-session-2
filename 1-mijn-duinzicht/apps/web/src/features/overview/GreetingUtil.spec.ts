/**
 * The greeting is the portal's one clock decision, so every boundary minute is pinned with
 * explicit local times.
 */
import { describe, expect, it } from 'bun:test';

import { GreetingUtil } from './GreetingUtil';

function localTime(hour: number, minute: number): Date {
  return new Date(2099, 0, 1, hour, minute);
}

describe('GreetingUtil', () => {
  it('returns morning from midnight up to 11:59', () => {
    expect(GreetingUtil.dayPartFor(localTime(0, 0))).toBe('morning');
    expect(GreetingUtil.dayPartFor(localTime(0, 30))).toBe('morning');
    expect(GreetingUtil.dayPartFor(localTime(11, 59))).toBe('morning');
  });

  it('returns afternoon from 12:00 up to 17:59', () => {
    expect(GreetingUtil.dayPartFor(localTime(12, 0))).toBe('afternoon');
    expect(GreetingUtil.dayPartFor(localTime(14, 30))).toBe('afternoon');
    expect(GreetingUtil.dayPartFor(localTime(17, 59))).toBe('afternoon');
  });

  it('returns evening from 18:00 up to 23:59', () => {
    expect(GreetingUtil.dayPartFor(localTime(18, 0))).toBe('evening');
    expect(GreetingUtil.dayPartFor(localTime(23, 59))).toBe('evening');
  });
});
