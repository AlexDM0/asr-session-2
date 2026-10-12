import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { productCategorySchema } from "../catalogueSchemas.ts";
import type { ProductRepository } from "../productRepository.ts";
import { jsonToolResult, logToolCall, readOnlyToolAnnotations } from "./toolResults.ts";

const listProductsOutputSchema = z.object({
  insurer: z.string(),
  products: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      category: productCategorySchema,
      summary: z.string(),
      quotableOnline: z.boolean(),
    }),
  ),
  howToContinue: z.string(),
});

export function registerListProductsTool(server: McpServer, repository: ProductRepository): void {
  server.registerTool(
    "list_products",
    {
      title: "List Duinzicht products",
      description:
        "Lists every insurance product that Duinzicht Verzekeringen (a Dutch insurer) sells, with its product code, its Dutch customer-facing name, a category, a one-line summary in English and whether a premium can be calculated online (quotableOnline). Start here: the product codes it returns are the input for every other tool on this server. Products with quotableOnline false are only described; there are no premium rules for them.",
      outputSchema: listProductsOutputSchema,
      annotations: readOnlyToolAnnotations,
    },
    async () => {
      logToolCall("list_products");
      return jsonToolResult({
        insurer: repository.insurer,
        products: repository.listProducts().map(({ code, name, category, summary, quotableOnline }) => ({ code, name, category, summary, quotableOnline })),
        howToContinue:
          "Call get_product for the description, cover and conditions of one product. For a product with quotableOnline true, call get_premium_rules and get_discount_rules, then explain_premium_calculation for the order of calculation and worked examples.",
      });
    },
  );
}
