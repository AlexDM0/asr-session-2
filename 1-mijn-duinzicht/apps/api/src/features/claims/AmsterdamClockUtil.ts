const AMSTERDAM_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone:  'Europe/Amsterdam',
  hourCycle: 'h23',
  year:      'numeric',
  month:     '2-digit',
  day:       '2-digit',
  hour:      '2-digit',
  minute:    '2-digit',
  second:    '2-digit',
});

interface AmsterdamDateTimeParts {
  readonly date:    string;
  readonly hours:   string;
  readonly minutes: string;
  readonly seconds: string;
}

function amsterdamPartsAt(instant: Date): AmsterdamDateTimeParts {
  const partValues = new Map(AMSTERDAM_FORMAT.formatToParts(instant).map((part) => [part.type, part.value]));
  const valueOf = (partType: Intl.DateTimeFormatPartTypes): string => partValues.get(partType) ?? '';
  return {
    date:    `${valueOf('year')}-${valueOf('month')}-${valueOf('day')}`,
    hours:   valueOf('hour'),
    minutes: valueOf('minute'),
    seconds: valueOf('second'),
  };
}

/** Europe/Amsterdam calendar date and local time of an instant; the caller reads the clock. */
export const AmsterdamClockUtil = Object.freeze({
  localDateAt(instant: Date): string {
    return amsterdamPartsAt(instant).date;
  },

  localDateTimeAt(instant: Date): string {
    const { date, hours, minutes } = amsterdamPartsAt(instant);
    return `${date}T${hours}:${minutes}`;
  },

  localDateTimeWithSecondsAt(instant: Date): string {
    const {
      date, hours, minutes, seconds 
    } = amsterdamPartsAt(instant);
    return `${date}T${hours}:${minutes}:${seconds}`;
  },
});
