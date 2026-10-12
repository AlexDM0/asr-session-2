export type EnvironmentSetting<Value> =
  | { readonly outcome: 'valid'; readonly value: Value }
  | { readonly outcome: 'invalid'; readonly variableName: string; readonly problem: string };

const WEB_PORT_VARIABLE = 'DUINZICHT_WEB_PORT';
const API_PORT_VARIABLE = 'DUINZICHT_API_PORT';
const API_ORIGIN_VARIABLE = 'DUINZICHT_API_ORIGIN';
const OPEN_BROWSER_VARIABLE = 'DUINZICHT_OPEN_BROWSER';
const DEFAULT_WEB_PORT = 3000;
const DEFAULT_API_PORT = 3001;
const LOWEST_PORT = 1;
const HIGHEST_PORT = 65_535;
const PORT_PATTERN = /^\d+$/;
const HTTP_PROTOCOLS: readonly string[] = ['http:', 'https:'];

function configuredValueOf(variableName: string): string | undefined {
  const configuredValue = process.env[variableName];
  return configuredValue === '' ? undefined : configuredValue;
}

function portSettingFor(variableName: string, defaultPort: number): EnvironmentSetting<number> {
  const configuredValue = configuredValueOf(variableName);
  if (configuredValue === undefined) {
    return { outcome: 'valid', value: defaultPort };
  }
  const port = Number(configuredValue);
  if (PORT_PATTERN.test(configuredValue) && port >= LOWEST_PORT && port <= HIGHEST_PORT) {
    return { outcome: 'valid', value: port };
  }
  return {
    outcome: 'invalid',
    variableName,
    problem: `${variableName} must be a whole number from ${LOWEST_PORT} to ${HIGHEST_PORT}, but is "${configuredValue}".`,
  };
}

function originSettingFor(configuredOrigin: string): EnvironmentSetting<string> {
  const address = URL.parse(configuredOrigin);
  const isBareOrigin = address !== null
    && HTTP_PROTOCOLS.includes(address.protocol)
    && address.pathname === '/'
    && address.search === ''
    && address.hash === ''
    && address.username === ''
    && address.password === '';
  if (isBareOrigin) {
    return { outcome: 'valid', value: address.origin };
  }
  return {
    outcome:      'invalid',
    variableName: API_ORIGIN_VARIABLE,
    problem:      `${API_ORIGIN_VARIABLE} must be an http or https origin without a path, such as http://localhost:3001, but is "${configuredOrigin}".`,
  };
}

function switchSettingFor(variableName: string, defaultValue: boolean): EnvironmentSetting<boolean> {
  const configuredValue = configuredValueOf(variableName);
  if (configuredValue === undefined) {
    return { outcome: 'valid', value: defaultValue };
  }
  if (configuredValue === 'true' || configuredValue === 'false') {
    return { outcome: 'valid', value: configuredValue === 'true' };
  }
  return {
    outcome: 'invalid',
    variableName,
    problem: `${variableName} must be true or false, but is "${configuredValue}".`,
  };
}

export const WebEnvironment = {
  /** Overrides port 3000 so parallel worktrees each serve their own portal. */
  get webPort(): EnvironmentSetting<number> {
    return portSettingFor(WEB_PORT_VARIABLE, DEFAULT_WEB_PORT);
  },

  /** Overrides where `/api/*` is proxied; unset, it follows `DUINZICHT_API_PORT` so one port moves a worktree's API and proxy together. */
  get apiOrigin(): EnvironmentSetting<string> {
    const configuredOrigin = configuredValueOf(API_ORIGIN_VARIABLE);
    if (configuredOrigin !== undefined) {
      return originSettingFor(configuredOrigin);
    }
    const apiPort = portSettingFor(API_PORT_VARIABLE, DEFAULT_API_PORT);
    if (apiPort.outcome === 'invalid') {
      return apiPort;
    }
    return { outcome: 'valid', value: `http://localhost:${apiPort.value}` };
  },
  /** Set to false to keep the dev server from opening the portal in the default browser on start. */
  get opensBrowser(): EnvironmentSetting<boolean> {
    return switchSettingFor(OPEN_BROWSER_VARIABLE, true);
  },
};
