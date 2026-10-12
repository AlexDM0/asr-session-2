import type { Log }       from '../../shared/log/LogRecord';
import { LogWordingUtil } from '../../shared/log/LogWordingUtil';

export function createConsoleLog(): Log {
  return (record) => {
    console.log(LogWordingUtil.lineFor(record));
  };
}
