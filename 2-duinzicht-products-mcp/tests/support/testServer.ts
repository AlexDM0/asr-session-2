import { join } from "node:path";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createDuinzichtProductsServer } from "../../src/duinzichtProductsServer.ts";
import { startHttpServer, type RunningHttpServer } from "../../src/httpServer.ts";
import { loadProductRepository, type ProductRepository } from "../../src/productRepository.ts";

export const dataDirectory = join(import.meta.dir, "..", "..", "data");

export interface TestServer {
  repository: ProductRepository;
  httpServer: RunningHttpServer;
  client: Client;
  stop(): Promise<void>;
}

// Port 0 lets the operating system pick a free port, so tests never collide with a running server.
export async function startTestServer(): Promise<TestServer> {
  const repository = await loadProductRepository(dataDirectory);
  const httpServer = await startHttpServer(0, () => createDuinzichtProductsServer(repository));

  const client = new Client({ name: "duinzicht-products-test-client", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(httpServer.mcpUrl)));

  return {
    repository,
    httpServer,
    client,
    async stop() {
      await client.close();
      await httpServer.stop();
    },
  };
}
