import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { serverInstructions, serverName } from "../src/duinzichtProductsServer.ts";
import { startTestServer, type TestServer } from "./support/testServer.ts";

const expectedToolNames = ["list_products", "get_product", "get_premium_rules", "get_discount_rules", "explain_premium_calculation"];

let testServer: TestServer;

beforeAll(async () => {
  testServer = await startTestServer();
});

afterAll(async () => {
  await testServer.stop();
});

async function callTool(name: string, toolArguments: Record<string, unknown> = {}) {
  const result = await testServer.client.callTool({ name, arguments: toolArguments });
  const firstContent = result.content[0];
  const text = firstContent?.type === "text" ? firstContent.text : "";
  const textJson = result.isError ? undefined : JSON.parse(text);
  return { result, text, structuredContent: result.structuredContent as any, textJson };
}

describe("server metadata", () => {
  test("announces its name and instructions", () => {
    expect(testServer.client.getServerVersion()?.name).toBe(serverName);
    expect(testServer.client.getInstructions()).toBe(serverInstructions);
    for (const toolName of expectedToolNames) expect(serverInstructions).toContain(toolName);
  });

  test("lists the five tools, all read-only with a title, a description and an output schema", async () => {
    const { tools } = await testServer.client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(expectedToolNames);
    for (const tool of tools) {
      expect(tool.title).toBeTruthy();
      expect(tool.description?.length).toBeGreaterThan(100);
      expect(tool.annotations).toEqual({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
      expect(tool.outputSchema?.type).toBe("object");
    }
  });

  test("names the valid product codes in the input schema", async () => {
    const { tools } = await testServer.client.listTools();
    const getPremiumRules = tools.find((tool) => tool.name === "get_premium_rules");
    const productCodeSchema = getPremiumRules?.inputSchema.properties?.productCode as { description?: string } | undefined;
    expect(productCodeSchema?.description).toContain("reis, rechtsbijstand, fiets");
  });
});

describe("tools", () => {
  test("list_products returns all seven products with the same JSON as text and structured content", async () => {
    const { structuredContent, textJson } = await callTool("list_products");
    expect(textJson).toEqual(structuredContent);
    expect(structuredContent.insurer).toBe("Duinzicht Verzekeringen");
    expect(structuredContent.products).toHaveLength(7);
    expect(structuredContent.products.filter((product: any) => product.quotableOnline).map((product: any) => product.name)).toEqual([
      "Doorlopende reisverzekering",
      "Rechtsbijstandverzekering",
      "Fietsverzekering",
    ]);
  });

  test("get_product returns cover and conditions of a quotable product", async () => {
    const { structuredContent } = await callTool("get_product", { productCode: "reis" });
    expect(structuredContent.product.name).toBe("Doorlopende reisverzekering");
    expect(structuredContent.product.conditions.waitingPeriod).toBeTruthy();
    expect(structuredContent.product.exclusions.length).toBeGreaterThan(0);
  });

  test("get_product says why a current product cannot be quoted online", async () => {
    const { structuredContent } = await callTool("get_product", { productCode: "auto" });
    expect(structuredContent.product.quotableOnline).toBe(false);
    expect(structuredContent.product.notQuotableReason).toBeTruthy();
    expect(structuredContent.howToContinue).toContain("Do not invent a premium");
  });

  test("get_product rejects an unknown product code", async () => {
    const { result, text } = await callTool("get_product", { productCode: "scooter" });
    expect(result.isError).toBe(true);
    expect(text).toContain("woonhuis");
  });

  test("get_premium_rules returns factors, modules, deductibles and the general rules", async () => {
    const { structuredContent } = await callTool("get_premium_rules", { productCode: "fiets" });
    expect(structuredContent.product).toEqual({ code: "fiets", name: "Fietsverzekering" });
    expect(structuredContent.baseMonthlyPremiumInEuros).toBe(4.2);
    expect(structuredContent.ratingFactors.map((factor: any) => factor.code)).toEqual(["bike-type", "purchase-value", "bike-age", "theft-risk-zone"]);
    expect(structuredContent.modules.length).toBeGreaterThan(0);
    expect(structuredContent.deductibles.length).toBeGreaterThan(1);
    expect(structuredContent.insuranceTaxPercentage).toBe(21);
    expect(structuredContent.packageDiscount.minimumActivePolicies).toBe(3);
    expect(structuredContent.calculationSteps).toHaveLength(7);
  });

  test("get_premium_rules refuses a product that cannot be quoted online and refers to an adviser", async () => {
    const { result, text } = await callTool("get_premium_rules", { productCode: "woonhuis" });
    expect(result.isError).toBe(true);
    expect(text).toContain("Woonhuisverzekering");
    expect(text).toContain("refer the customer to an adviser");
    expect(text).toContain("reis, rechtsbijstand, fiets");
  });

  test("get_premium_rules rejects an unknown product code", async () => {
    const { result, text } = await callTool("get_premium_rules", { productCode: "scooter" });
    expect(result.isError).toBe(true);
    expect(text).toContain(`Unknown product code "scooter"`);
  });

  test("get_discount_rules and explain_premium_calculation refuse a product that cannot be quoted online", async () => {
    for (const toolName of ["get_discount_rules", "explain_premium_calculation"]) {
      const { result, text } = await callTool(toolName, { productCode: "auto" });
      expect(result.isError).toBe(true);
      expect(text).toContain("cannot be quoted online");
    }
  });

  test("get_discount_rules returns the package discount and every product's deductible discounts", async () => {
    const { structuredContent } = await callTool("get_discount_rules");
    expect(structuredContent.packageDiscount.discountPercentage).toBe(10);
    expect(structuredContent.deductibleDiscounts.map((entry: any) => entry.product.code)).toEqual(["reis", "rechtsbijstand", "fiets"]);
    expect(structuredContent.discountSteps.map((step: any) => step.code)).toEqual(["deductible-discount", "package-discount", "minimum-premium"]);
  });

  test("get_discount_rules can be limited to one product", async () => {
    const { structuredContent } = await callTool("get_discount_rules", { productCode: "rechtsbijstand" });
    expect(structuredContent.deductibleDiscounts).toHaveLength(1);
    expect(structuredContent.deductibleDiscounts[0].product.code).toBe("rechtsbijstand");
  });

  test("explain_premium_calculation returns the ordered steps, Sanne's examples and the edge cases", async () => {
    const { structuredContent } = await callTool("explain_premium_calculation");
    expect(structuredContent.calculationSteps.map((step: any) => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(structuredContent.workedExampleCustomer.name).toBe("Sanne de Vries");
    expect(structuredContent.workedExamples.map((example: any) => [example.productCode, example.monthlyPremiumInEuros])).toEqual([
      ["reis", 7.84],
      ["rechtsbijstand", 26.61],
      ["fiets", 14.27],
      ["reis", 9.08],
      ["fiets", 3.63],
    ]);
  });

  test("explain_premium_calculation can be limited to one product", async () => {
    const { structuredContent } = await callTool("explain_premium_calculation", { productCode: "reis" });
    expect(structuredContent.workedExamples.map((example: any) => example.productCode)).toEqual(["reis", "reis"]);
  });
});

describe("http", () => {
  const initializeBody = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "raw-http-test", version: "1.0.0" } },
  });
  const mcpHeaders = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };

  test("answers a plain 2025-era initialize request", async () => {
    const response = await fetch(testServer.httpServer.mcpUrl, { method: "POST", headers: mcpHeaders, body: initializeBody });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(`"serverInfo":{"name":"${serverName}"`);
  });

  test("answers on the IPv4 and the IPv6 loopback address", async () => {
    for (const loopbackHost of ["127.0.0.1", "[::1]"]) {
      const response = await fetch(`http://${loopbackHost}:${testServer.httpServer.port}/mcp`, { method: "POST", headers: mcpHeaders, body: initializeBody });
      expect(response.status).toBe(200);
    }
  });

  test("refuses a Host header that is not localhost", async () => {
    const response = await fetch(testServer.httpServer.mcpUrl, {
      method: "POST",
      headers: { ...mcpHeaders, Host: "evil.example" },
      body: initializeBody,
    });
    expect(response.status).toBe(403);
  });

  test("refuses an Origin header that is not localhost", async () => {
    const response = await fetch(testServer.httpServer.mcpUrl, {
      method: "POST",
      headers: { ...mcpHeaders, Origin: "https://evil.example" },
      body: initializeBody,
    });
    expect(response.status).toBe(403);
  });

  test("accepts an Origin header on localhost", async () => {
    const response = await fetch(testServer.httpServer.mcpUrl, {
      method: "POST",
      headers: { ...mcpHeaders, Origin: `http://localhost:${testServer.httpServer.port}` },
      body: initializeBody,
    });
    expect(response.status).toBe(200);
  });

  test("answers 404 outside the MCP endpoint", async () => {
    const response = await fetch(`http://localhost:${testServer.httpServer.port}/`);
    expect(response.status).toBe(404);
  });
});
