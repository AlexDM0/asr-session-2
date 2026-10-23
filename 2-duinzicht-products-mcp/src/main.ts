import { join, resolve } from "node:path";
import { createDuinzichtProductsServer, serverName } from "./duinzichtProductsServer.ts";
import { renderDocsPage } from "./docsPages.ts";
import { PortInUseError, startHttpServer } from "./httpServer.ts";
import { createPortalSnapshotReader, defaultPortalDatabasePath, defaultPortalSeedPath } from "./portalDatabase.ts";
import { loadProductRepository, ProductStoreError } from "./productRepository.ts";
import { readServerCatalogue } from "./serverCatalogue.ts";

const defaultPort = 3333;
const defaultDataDirectory = join(import.meta.dir, "..", "data");

function readPort(): number {
  const configuredPort = process.env.PORT;
  if (configuredPort === undefined || configuredPort.trim() === "") return defaultPort;

  const port = Number(configuredPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    stopWithError(`PORT must be a whole number between 1 and 65535, got "${configuredPort}".`);
  }
  return port;
}

function green(message: string): string {
  return process.stdout.isTTY ? `\x1b[32m${message}\x1b[0m` : message;
}

function stopWithError(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const dataDirectory = resolve(process.env.PRODUCTS_DATA_DIRECTORY ?? defaultDataDirectory);
const port = readPort();
const readPortalSnapshot = createPortalSnapshotReader(resolve(process.env.PORTAL_DATABASE_PATH ?? defaultPortalDatabasePath), defaultPortalSeedPath);

try {
  const repository = await loadProductRepository(dataDirectory);
  const createServer = () => createDuinzichtProductsServer(repository);
  const serverCatalogue = await readServerCatalogue(createServer);
  const runningServer = await startHttpServer(port, createServer, (pathname) => renderDocsPage(pathname, repository, serverCatalogue, readPortalSnapshot));

  // stdout, not stderr: Windows PowerShell shows stderr of a native command in red, as if it failed.
  console.log(`Loaded ${repository.listProducts().length} products from ${dataDirectory}`);
  console.log(green(`MCP server "${serverName}" is running at ${runningServer.mcpUrl}`));
  console.log(`Readable docs for people: ${runningServer.docsUrl}`);
  const portalSnapshot = readPortalSnapshot();
  console.log("problem" in portalSnapshot ? portalSnapshot.problem : `Policies page reads the portal ${portalSnapshot.source} at ${portalSnapshot.path}`);
  console.log("Press Ctrl+C to stop.");
} catch (error) {
  if (error instanceof ProductStoreError || error instanceof PortInUseError) stopWithError(error.message);
  throw error;
}
