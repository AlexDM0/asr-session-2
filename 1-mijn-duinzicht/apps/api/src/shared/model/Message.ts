import type { CalendarDate } from './Profile';

export interface Message {
  readonly id:     string;
  readonly title:  string;
  readonly sentOn: CalendarDate;
  readonly isRead: boolean;
  readonly body:   string;
}
