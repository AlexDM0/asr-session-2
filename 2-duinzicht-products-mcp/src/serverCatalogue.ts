import { InMemoryTransport, type Implementation, type JSONRPCMessage, type McpServer, type Tool } from "@modelcontextprotocol/server";

export interface ServerCatalogue {
  serverInfo: Implementation;
  instructions: string;
  tools: Tool[];
}

// Asks a fresh server what it announces to a real client, so the docs page always shows the registered tools as they are.
export async function readServerCatalogue(createServer: () => McpServer): Promise<ServerCatalogue> {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const pendingResponses = new Map<number, (result: Record<string, unknown>) => void>();

  clientTransport.onmessage = (message) => {
    if ("id" in message && "result" in message && typeof message.id === "number") pendingResponses.get(message.id)?.(message.result);
  };

  async function sendRequest(id: number, method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = new Promise<Record<string, unknown>>((resolve) => pendingResponses.set(id, resolve));
    await clientTransport.send({ jsonrpc: "2.0", id, method, params } as JSONRPCMessage);
    return response;
  }

  await server.connect(serverTransport);
  try {
    const initializeResult = await sendRequest(1, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "duinzicht-products-docs", version: "1.0.0" },
    });
    await clientTransport.send({ jsonrpc: "2.0", method: "notifications/initialized" });
    const toolsListResult = await sendRequest(2, "tools/list", {});

    return {
      serverInfo: initializeResult.serverInfo as Implementation,
      instructions: (initializeResult.instructions as string | undefined) ?? "",
      tools: toolsListResult.tools as Tool[],
    };
  } finally {
    await server.close();
  }
}
