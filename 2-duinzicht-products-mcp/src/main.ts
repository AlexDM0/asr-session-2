import { join, resolve } from "node:path";
import { createDuinzichtProductsServer, serverName } from "./duinzichtProductsServer.ts";
import { PortInUseError, startHttpServer } from "./httpServer.ts";
import { loadProductRepository, ProductStoreError } from "./productRepository.ts";

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

function stopWithError(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const dataDirectory = resolve(process.env.PRODUCTS_DATA_DIRECTORY ?? defaultDataDirectory);
const port = readPort();

try {
  const repository = await loadProductRepository(dataDirectory);
  const runningServer = await startHttpServer(port, () => createDuinzichtProductsServer(repository));

  console.error(`Loaded ${repository.listProducts().length} products from ${dataDirectory}`);
  console.error(`MCP server "${serverName}" is running at ${runningServer.mcpUrl}`);
  console.error("Press Ctrl+C to stop.");
} catch (error) {
  if (error instanceof ProductStoreError || error instanceof PortInUseError) stopWithError(error.message);
  throw error;
}
