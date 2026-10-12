import type { LogRecord } from './LogRecord';

const RESET_COMMAND = 'bun run reset';

function refusalLineFor(record: Extract<LogRecord, { kind: 'storeRefused' }>): string {
  if (record.problem === 'unreadable') {
    return `The store at ${record.databasePath} cannot be read as a database. Run \`${RESET_COMMAND}\` to replace it with the seed.`;
  }
  return `The store at ${record.databasePath} has structure version ${record.foundVersion ?? 'unknown'}, but this code expects version ${record.expectedVersion}. `
    + `Run \`${RESET_COMMAND}\` to replace it with the seed.`;
}

export const LogWordingUtil = {
  lineFor(record: LogRecord): string {
    switch (record.kind) {
      case 'storeCreated':
        return `Created and seeded the store at ${record.databasePath}.`;
      case 'storeReset':
        return `Reset the store at ${record.databasePath} to the seed and emptied ${record.uploadDirectory}.`;
      case 'storeRefused':
        return refusalLineFor(record);
      case 'apiStarted':
        return `Mijn Duinzicht API: ${record.origin}`;
      case 'requestFailed':
        return `A request failed unexpectedly: ${record.errorMessage}`;
    }
  },
} as const;
