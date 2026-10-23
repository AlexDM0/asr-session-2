import { join } from "node:path";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { renderDocsPage } from "../../src/docsPages.ts";
import { createDuinzichtProductsServer } from "../../src/duinzichtProductsServer.ts";
import { startHttpServer, type RunningHttpServer } from "../../src/httpServer.ts";
import { createPortalSnapshotReader, type PortalSnapshotReader } from "../../src/portalDatabase.ts";
import { loadProductRepository, type ProductRepository } from "../../src/productRepository.ts";
import { readServerCatalogue } from "../../src/serverCatalogue.ts";

export const dataDirectory = join(import.meta.dir, "..", "..", "data");
const portalFixtureDirectory = join(import.meta.dir, "..", "fixtures");

// The fixtures stand in for the portal folder, so the tests never depend on it or on a running portal.
export const portalSeedFixturePath = join(portalFixtureDirectory, "portal-seed.json");
export const missingPortalDatabasePath = join(portalFixtureDirectory, "no-portal.sqlite");

export interface TestServer {
  repository: ProductRepository;
  httpServer: RunningHttpServer;
  client: Client;
  stop(): Promise<void>;
}

// Port 0 lets the operating system pick a free port, so tests never collide with a running server.
export async function startTestServer(
  readPortalSnapshot: PortalSnapshotReader = createPortalSnapshotReader(missingPortalDatabasePath, portalSeedFixturePath),
): Promise<TestServer> {
  const repository = await loadProductRepository(dataDirectory);
  const createServer = () => createDuinzichtProductsServer(repository);
  const serverCatalogue = await readServerCatalogue(createServer);
  const httpServer = await startHttpServer(0, createServer, (pathname) => renderDocsPage(pathname, repository, serverCatalogue, readPortalSnapshot));

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
