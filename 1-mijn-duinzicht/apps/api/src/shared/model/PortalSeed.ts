import type { Claim }               from './Claim';
import type { DirectDebitSchedule } from './DirectDebitSchedule';
import type { Message }             from './Message';
import type { Policy }              from './Policy';
import type { Preferences }         from './Preferences';
import type { Profile }             from './Profile';

export interface PortalSeed {
  readonly customer:            Profile;
  readonly preferences:         Preferences;
  readonly directDebitSchedule: DirectDebitSchedule | null;
  readonly policies:            readonly Policy[];
  readonly claims:              readonly Claim[];
  readonly messages:            readonly Message[];
}
