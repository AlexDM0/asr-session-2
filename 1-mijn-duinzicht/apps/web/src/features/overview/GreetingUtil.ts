import type { DayPart } from './overviewCopy';

const AFTERNOON_START_HOUR = 12;
const EVENING_START_HOUR = 18;

export const GreetingUtil = {
  // The greeting is the one decision the local time may make; everything else stays independent of the clock.
  dayPartFor: (date: Date): DayPart => {
    const hour = date.getHours();
    if (hour < AFTERNOON_START_HOUR) {
      return 'morning';
    }
    return hour < EVENING_START_HOUR ? 'afternoon' : 'evening';
  },
} as const;
