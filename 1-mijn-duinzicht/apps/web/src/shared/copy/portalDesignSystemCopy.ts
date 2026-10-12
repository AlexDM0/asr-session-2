import type { DesignSystemCopy } from '../../lib/design-system/DesignSystemCopy';

export const PORTAL_DESIGN_SYSTEM_COPY: DesignSystemCopy = {
  loadingAnnouncement:      'Bezig met laden…',
  retryAction:              'Opnieuw proberen',
  defaultErrorMessage:      'Er ging iets mis bij het laden. Probeer het opnieuw.',
  compactErrorMessage:      'Laden mislukt',
  breadcrumbNavigationName: 'Kruimelpad',
  timelineStateLabels:      { done: 'Afgerond', current: 'Huidige stap', todo: 'Nog te doen' },
  progressStepsText:        (doneCount, totalCount) => `${doneCount} van ${totalCount} stappen afgerond`,
};
