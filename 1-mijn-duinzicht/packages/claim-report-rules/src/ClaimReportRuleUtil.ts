export type ClaimCategory = 'home' | 'car' | 'travel' | 'liability';

export type PolicyKind = 'home' | 'contents' | 'car' | 'liability';

export type IncidentDateVerdict =
  | { readonly outcome: 'acceptable' }
  | { readonly outcome: 'invalidFormat' }
  | { readonly outcome: 'inFuture' };

export type DescriptionVerdict =
  | { readonly outcome: 'acceptable'; readonly trimmedText: string }
  | { readonly outcome: 'required' | 'tooShort' | 'tooLong' };

export const DESCRIPTION_MINIMUM_CODE_POINTS = 10;

export const DESCRIPTION_MAXIMUM_CODE_POINTS = 2000;

export const CLAIM_POLICY_ELIGIBILITY: Readonly<Record<ClaimCategory, readonly PolicyKind[]>> = Object.freeze({
  home:      Object.freeze<PolicyKind[]>(['home', 'contents']),
  car:       Object.freeze<PolicyKind[]>(['car']),
  travel:    Object.freeze<PolicyKind[]>(['contents']),
  liability: Object.freeze<PolicyKind[]>(['liability']),
});

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealCalendarDate(isoDate: string): boolean {
  const match = ISO_DATE_PATTERN.exec(isoDate);
  if (match === null) {
    return false;
  }
  const [, year, month, day] = match.map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const ClaimReportRuleUtil = Object.freeze({
  /** Both dates are `YYYY-MM-DD`; `today` is the Europe/Amsterdam date the caller determined. */
  incidentDateVerdictFor(isoDate: string, today: string): IncidentDateVerdict {
    if (!isRealCalendarDate(isoDate)) {
      return { outcome: 'invalidFormat' };
    }
    return isoDate > today ? { outcome: 'inFuture' } : { outcome: 'acceptable' };
  },

  descriptionVerdictFor(text: string): DescriptionVerdict {
    const trimmedText = text.trim();
    const codePointCount = [...trimmedText].length;
    if (codePointCount === 0) {
      return { outcome: 'required' };
    }
    if (codePointCount < DESCRIPTION_MINIMUM_CODE_POINTS) {
      return { outcome: 'tooShort' };
    }
    if (codePointCount > DESCRIPTION_MAXIMUM_CODE_POINTS) {
      return { outcome: 'tooLong' };
    }
    return { outcome: 'acceptable', trimmedText };
  },
});
