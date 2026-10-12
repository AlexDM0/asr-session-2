export type DayPart = 'morning' | 'afternoon' | 'evening';

const GREETING_BY_DAY_PART: Readonly<Record<DayPart, string>> = {
  morning:   'Goedemorgen',
  afternoon: 'Goedemiddag',
  evening:   'Goedenavond',
};

function countedPhrase(count: number, singular: string, plural: string): string {
  if (count === 0) {
    return `geen ${plural}`;
  }
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

/** Every Dutch text the Overzicht screen owns. */
export const OVERVIEW_COPY = {
  reportClaimAction:  'Schade melden',
  viewPoliciesAction: 'Bekijk mijn polissen',
  heroError:          'We konden je overzicht niet laden.',
  greetingHeading:    (dayPart: DayPart, firstName: string): string => `${GREETING_BY_DAY_PART[dayPart]}, ${firstName}`,
  leadSentence:       (activePolicyCount: number, openClaimCount: number): string => {
    const policyPart = countedPhrase(activePolicyCount, 'lopende verzekering', 'lopende verzekeringen');
    const claimPart = countedPhrase(openClaimCount, 'openstaande schademelding', 'openstaande schademeldingen');
    return `Je hebt ${policyPart} en ${claimPart}.`;
  },
} as const;
