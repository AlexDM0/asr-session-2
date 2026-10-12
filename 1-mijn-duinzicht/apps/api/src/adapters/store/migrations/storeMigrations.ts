import { INITIAL_SCHEMA_STATEMENTS } from './initialSchemaMigration';

export interface StoreMigration {
  readonly version:    number;
  readonly statements: readonly string[];
}

/** The migration registry: versions are contiguous from 1, and a new migration adds one line with the next version. */
export const STORE_MIGRATIONS: readonly StoreMigration[] = [
  { version: 1, statements: INITIAL_SCHEMA_STATEMENTS },
];

export function currentStructureVersion(): number {
  return STORE_MIGRATIONS.at(-1)?.version ?? 0;
}
