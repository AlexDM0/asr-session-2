import type { Log } from '../shared/log/LogRecord';

import type { PortalStore } from './store/PortalStore';

/** What every route-table factory receives; no handler reads the environment. */
export interface ApiContext {
  readonly store:           PortalStore;
  readonly uploadDirectory: string;
  readonly log:             Log;
}
