import {
  createMcpHandler,
  hostHeaderValidationResponse,
  localhostAllowedHostnames,
  localhostAllowedOrigins,
  originValidationResponse,
  type McpServer,
} from "@modelcontextprotocol/server";
import { docsPath } from "./docsPages.ts";

export const mcpPath = "/mcp";

// Bind both loopback addresses: "localhost" resolves to ::1 on some machines and to 127.0.0.1 on others.
const ipv4LoopbackAddress = "127.0.0.1";
const ipv6LoopbackAddress = "::1";

export interface RunningHttpServer {
  port: number;
  mcpUrl: string;
  docsUrl: string;
  stop(): Promise<void>;
}

export class PortInUseError extends Error {
  constructor(readonly port: number) {
    super(`Port ${port} is already in use. Stop the other process that uses it, or start this server with another PORT.`);
    this.name = "PortInUseError";
  }
}

// renderDocsPage returns the HTML of a readable docs page, or undefined when the path is not one.
export async function startHttpServer(
  port: number,
  createServer: () => McpServer,
  renderDocsPage: (pathname: string) => string | undefined = () => undefined,
): Promise<RunningHttpServer> {
  const mcpHandler = createMcpHandler(createServer, {
    onerror: (error) => console.error(`MCP request failed: ${error.message}`),
  });
  const allowedHostnames = localhostAllowedHostnames();
  const allowedOriginHostnames = localhostAllowedOrigins();

  async function handleRequest(request: Request): Promise<Response> {
    const forbiddenHostResponse = hostHeaderValidationResponse(request, allowedHostnames);
    if (forbiddenHostResponse) {
      console.error(`Refused a request with Host "${request.headers.get("host") ?? ""}"; only localhost is allowed.`);
      return forbiddenHostResponse;
    }
    // A web page on another site can reach localhost from the visitor's browser; its Origin header gives it away.
    const forbiddenOriginResponse = originValidationResponse(request, allowedOriginHostnames);
    if (forbiddenOriginResponse) {
      console.error(`Refused a request with Origin "${request.headers.get("origin") ?? ""}"; only localhost is allowed.`);
      return forbiddenOriginResponse;
    }
    const pathname = new URL(request.url).pathname;
    if (pathname === mcpPath) return mcpHandler.fetch(request);

    const docsPage = request.method === "GET" ? renderDocsPage(pathname) : undefined;
    if (docsPage !== undefined) return new Response(docsPage, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (request.method === "GET" && pathname === "/") return Response.redirect(new URL(docsPath, request.url).href, 302);
    return new Response(`Not found. The MCP endpoint is ${mcpPath}; readable docs are at ${docsPath}.\n`, { status: 404 });
  }

  const ipv4Server = serveOrThrowPortInUse(port, ipv4LoopbackAddress, handleRequest);
  const boundPort = ipv4Server.port ?? port;

  let ipv6Server: Bun.Server<undefined> | undefined;
  try {
    ipv6Server = serveOrThrowPortInUse(boundPort, ipv6LoopbackAddress, handleRequest);
  } catch (error) {
    if (error instanceof PortInUseError) {
      await ipv4Server.stop(true);
      throw error;
    }
    console.error(`IPv6 loopback ${ipv6LoopbackAddress} is not available, serving on ${ipv4LoopbackAddress} only.`);
  }

  return {
    port: boundPort,
    mcpUrl: `http://localhost:${boundPort}${mcpPath}`,
    docsUrl: `http://localhost:${boundPort}${docsPath}`,
    async stop() {
      await mcpHandler.close();
      await Promise.all([ipv4Server.stop(true), ipv6Server?.stop(true)]);
    },
  };
}

function serveOrThrowPortInUse(port: number, hostname: string, handleRequest: (request: Request) => Promise<Response>): Bun.Server<undefined> {
  try {
    return Bun.serve({ port, hostname, fetch: handleRequest });
  } catch (error) {
    if (isAddressInUseError(error)) throw new PortInUseError(port);
    throw error;
  }
}

function isAddressInUseError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EADDRINUSE";
}
