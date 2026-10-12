export type LogRecord =
  | { readonly kind: 'storeCreated'; readonly databasePath: string }
  | { readonly kind: 'storeReset'; readonly databasePath: string; readonly uploadDirectory: string }
  | {
    readonly kind:            'storeRefused';
    readonly databasePath:    string;
    readonly problem:         'unreadable' | 'versionMismatch';
    readonly foundVersion:    number | null;
    readonly expectedVersion: number;
  }
  | { readonly kind: 'apiStarted'; readonly origin: string }
  | { readonly kind: 'requestFailed'; readonly errorMessage: string };

export type Log = (record: LogRecord) => void;
