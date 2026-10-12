/**
 * The dev server takes its port and the API address it proxies to from here, so the cases that matter
 * are the defaults, that the API origin follows the API port unless it is set explicitly (worktrees),
 * and that an invalid port or origin is refused instead of guessed.
 */
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'bun:test';

import { WebEnvironment } from './WebEnvironment';

const VARIABLE_NAMES = ['DUINZICHT_WEB_PORT', 'DUINZICHT_API_PORT', 'DUINZICHT_API_ORIGIN', 'DUINZICHT_OPEN_BROWSER'] as const;
const originalValues = new Map<string, string | undefined>();

beforeAll(() => {
  for (const variableName of VARIABLE_NAMES) {
    originalValues.set(variableName, process.env[variableName]);
  }
});

afterEach(() => {
  for (const [variableName, originalValue] of originalValues) {
    if (originalValue === undefined) {
      delete process.env[variableName];
    } else {
      process.env[variableName] = originalValue;
    }
  }
});

function clearVariables(): void {
  for (const variableName of VARIABLE_NAMES) {
    delete process.env[variableName];
  }
}

describe('WebEnvironment.webPort', () => {
  it('defaults to 3000 when the variable is unset or empty', () => {
    clearVariables();
    expect(WebEnvironment.webPort).toEqual({ outcome: 'valid', value: 3000 });

    process.env['DUINZICHT_WEB_PORT'] = '';
    expect(WebEnvironment.webPort).toEqual({ outcome: 'valid', value: 3000 });
  });

  it('reads the variable each time it is asked', () => {
    process.env['DUINZICHT_WEB_PORT'] = '4100';
    expect(WebEnvironment.webPort).toEqual({ outcome: 'valid', value: 4100 });

    process.env['DUINZICHT_WEB_PORT'] = '4200';
    expect(WebEnvironment.webPort).toEqual({ outcome: 'valid', value: 4200 });
  });

  it('refuses port 0, a port above 65535 and text, naming the variable', () => {
    for (const invalidValue of ['0', '65536', 'example', '3000.5']) {
      process.env['DUINZICHT_WEB_PORT'] = invalidValue;

      const setting = WebEnvironment.webPort;

      expect(setting.outcome).toBe('invalid');
      expect(setting.outcome === 'invalid' && setting.problem).toContain('DUINZICHT_WEB_PORT');
    }
  });
});

describe('WebEnvironment.apiOrigin', () => {
  it('defaults to localhost on port 3001', () => {
    clearVariables();

    expect(WebEnvironment.apiOrigin).toEqual({ outcome: 'valid', value: 'http://localhost:3001' });
  });

  it('follows DUINZICHT_API_PORT when no origin is set', () => {
    clearVariables();
    process.env['DUINZICHT_API_PORT'] = '4101';

    expect(WebEnvironment.apiOrigin).toEqual({ outcome: 'valid', value: 'http://localhost:4101' });
  });

  it('is overridden by DUINZICHT_API_ORIGIN, written without a trailing slash', () => {
    process.env['DUINZICHT_API_PORT'] = '4101';
    process.env['DUINZICHT_API_ORIGIN'] = 'http://api.example.test:4200/';

    expect(WebEnvironment.apiOrigin).toEqual({ outcome: 'valid', value: 'http://api.example.test:4200' });
  });

  it('refuses an invalid DUINZICHT_API_PORT when no origin is set', () => {
    clearVariables();
    process.env['DUINZICHT_API_PORT'] = 'example';

    const setting = WebEnvironment.apiOrigin;

    expect(setting.outcome).toBe('invalid');
    expect(setting.outcome === 'invalid' && setting.problem).toContain('DUINZICHT_API_PORT');
  });

  it('refuses an origin that is not an http address or that carries a path', () => {
    for (const invalidOrigin of ['example', 'ftp://api.example.test', 'http://api.example.test/api']) {
      process.env['DUINZICHT_API_ORIGIN'] = invalidOrigin;

      const setting = WebEnvironment.apiOrigin;

      expect(setting.outcome).toBe('invalid');
      expect(setting.outcome === 'invalid' && setting.problem).toContain('DUINZICHT_API_ORIGIN');
    }
  });
});

describe('WebEnvironment.opensBrowser', () => {
  it('opens the browser when the variable is unset or empty', () => {
    clearVariables();
    expect(WebEnvironment.opensBrowser).toEqual({ outcome: 'valid', value: true });

    process.env['DUINZICHT_OPEN_BROWSER'] = '';
    expect(WebEnvironment.opensBrowser).toEqual({ outcome: 'valid', value: true });
  });

  it('keeps the browser closed when the variable is false', () => {
    process.env['DUINZICHT_OPEN_BROWSER'] = 'false';
    expect(WebEnvironment.opensBrowser).toEqual({ outcome: 'valid', value: false });
  });

  it('refuses a value other than true or false', () => {
    process.env['DUINZICHT_OPEN_BROWSER'] = 'yes';
    expect(WebEnvironment.opensBrowser).toMatchObject({ outcome: 'invalid', variableName: 'DUINZICHT_OPEN_BROWSER' });
  });
});
