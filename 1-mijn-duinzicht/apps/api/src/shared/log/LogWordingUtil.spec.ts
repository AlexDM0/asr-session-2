/**
 * The log vocabulary is a typed union and this util is the one place it becomes English text. Each
 * kind gets one line; the refusals must name the problem and the reset command, because that line is
 * all a developer sees when the API refuses to start.
 */
import { describe, expect, it } from 'bun:test';

import { LogWordingUtil } from './LogWordingUtil';

describe('LogWordingUtil.lineFor', () => {
  it('words a created store with its path', () => {
    expect(LogWordingUtil.lineFor({ kind: 'storeCreated', databasePath: '/example/portal.sqlite' })).toBe('Created and seeded the store at /example/portal.sqlite.');
  });

  it('words a reset with the store and the emptied upload directory', () => {
    expect(LogWordingUtil.lineFor({ kind: 'storeReset', databasePath: '/example/portal.sqlite', uploadDirectory: '/example/uploads' }))
      .toBe('Reset the store at /example/portal.sqlite to the seed and emptied /example/uploads.');
  });

  it('words an unreadable store with the reset command', () => {
    const line = LogWordingUtil.lineFor({
      kind: 'storeRefused', databasePath: '/example/portal.sqlite', problem: 'unreadable', foundVersion: null, expectedVersion: 1,
    });

    expect(line).toContain('cannot be read as a database');
    expect(line).toContain('bun run reset');
  });

  it('words a version mismatch with both structure versions and the reset command', () => {
    const line = LogWordingUtil.lineFor({
      kind: 'storeRefused', databasePath: '/example/portal.sqlite', problem: 'versionMismatch', foundVersion: 99, expectedVersion: 1,
    });

    expect(line).toBe('The store at /example/portal.sqlite has structure version 99, but this code expects version 1. Run `bun run reset` to replace it with the seed.');
  });

  it('words the start with the address to open', () => {
    expect(LogWordingUtil.lineFor({ kind: 'apiStarted', origin: 'http://localhost:4000' })).toBe('Mijn Duinzicht API: http://localhost:4000');
  });

  it('words a failed request with the error message', () => {
    expect(LogWordingUtil.lineFor({ kind: 'requestFailed', errorMessage: 'Example failure.' })).toBe('A request failed unexpectedly: Example failure.');
  });
});
