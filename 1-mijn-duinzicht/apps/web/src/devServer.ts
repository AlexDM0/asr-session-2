import type { ApiErrorWire } from '@mijn-duinzicht/api-contract/ApiErrorWire';

import { WebEnvironment } from './WebEnvironment';
import portalPage         from './index.html';

const FAILURE_EXIT_CODE = 1;
const BAD_GATEWAY_STATUS = 502;
const HOP_BY_HOP_HEADERS: readonly string[] = ['host', 'connection', 'keep-alive', 'transfer-encoding'];
const BROWSER_OPEN_COMMANDS: Partial<Record<NodeJS.Platform, readonly string[]>> = {
  darwin: ['open'],
  linux:  ['xdg-open'],
  win32:  ['cmd', '/c', 'start', ''],
};

function exitWithProblem(problem: string): never {
  console.error(problem);
  process.exit(FAILURE_EXIT_CODE);
}

function forwardedHeadersOf(request: Request): Headers {
  const headers = new Headers(request.headers);
  for (const headerName of HOP_BY_HOP_HEADERS) {
    headers.delete(headerName);
  }
  return headers;
}

function apiUnreachableResponse(apiOrigin: string): Response {
  const body: ApiErrorWire = { error: { code: 'apiUnreachable', message: `The API at ${apiOrigin} does not answer.` } };
  return Response.json(body, { status: BAD_GATEWAY_STATUS });
}

function proxyToApi(apiOrigin: string): (request: Request) => Promise<Response> {
  return async (request) => {
    const incomingAddress = new URL(request.url);
    const apiAddress = new URL(incomingAddress.pathname + incomingAddress.search, apiOrigin);
    try {
      return await fetch(apiAddress, {
        method:   request.method,
        headers:  forwardedHeadersOf(request),
        body:     request.body,
        redirect: 'manual',
      });
    } catch {
      return apiUnreachableResponse(apiOrigin);
    }
  };
}

function openInBrowser(address: string): void {
  const openCommand = BROWSER_OPEN_COMMANDS[process.platform];
  if (openCommand === undefined) {
    return;
  }
  try {
    Bun.spawn([...openCommand, address], { stdout: 'ignore', stderr: 'ignore' });
  } catch {
    console.error(`Could not open ${address} in a browser; open it by hand.`);
  }
}

function startDevServer(): void {
  const portSetting = WebEnvironment.webPort;
  if (portSetting.outcome === 'invalid') {
    exitWithProblem(portSetting.problem);
  }
  const apiOriginSetting = WebEnvironment.apiOrigin;
  if (apiOriginSetting.outcome === 'invalid') {
    exitWithProblem(apiOriginSetting.problem);
  }
  const opensBrowserSetting = WebEnvironment.opensBrowser;
  if (opensBrowserSetting.outcome === 'invalid') {
    exitWithProblem(opensBrowserSetting.problem);
  }
  const server = Bun.serve({
    port:        portSetting.value,
    development: { hmr: false },
    routes:      {
      '/api/*': proxyToApi(apiOriginSetting.value),
      '/*':     portalPage,
    },
  });
  const portalAddress = `http://localhost:${server.port}`;
  console.log(`Mijn Duinzicht: ${portalAddress}`);
  if (opensBrowserSetting.value) {
    openInBrowser(portalAddress);
  }
}

startDevServer();
