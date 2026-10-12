import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { productSchema } from "../catalogueSchemas.ts";
import type { ProductRepository } from "../productRepository.ts";
import { jsonToolResult, logToolCall, readOnlyToolAnnotations, toolErrorResult } from "./toolResults.ts";

export function registerGetProductTool(server: McpServer, repository: ProductRepository): void {
  const productCodes = repository.listProducts().map((product) => product.code);

  server.registerTool(
    "get_product",
    {
      title: "Get a Duinzicht product",
      description:
        "Returns one Duinzicht Verzekeringen product: its Dutch name, a description, what it covers (cover) and what it does not cover (exclusions). A product that can be quoted online also has conditions: the start of cover, the waiting period and who is accepted. For a product that cannot be quoted online it says why, and there are no premium rules. Use the product code from list_products. This tool returns no prices; use get_premium_rules for those.",
      inputSchema: z.object({
        productCode: z.string().describe(`Product code from list_products: ${productCodes.join(", ")}`),
      }),
      outputSchema: z.object({ product: productSchema, howToContinue: z.string() }),
      annotations: readOnlyToolAnnotations,
    },
    async ({ productCode }) => {
      logToolCall("get_product", { productCode });
      const product = repository.findProduct(productCode);
      if (!product) return toolErrorResult(`Unknown product code "${productCode}". Valid codes: ${productCodes.join(", ")}.`);

      return jsonToolResult({
        product,
        howToContinue: product.quotableOnline
          ? `Call get_premium_rules with productCode "${product.code}" for the base premium, rating factors, modules and deductibles.`
          : "This product cannot be quoted online, so there are no premium rules for it. Do not invent a premium; refer the customer to an adviser.",
      });
    },
  );
}
