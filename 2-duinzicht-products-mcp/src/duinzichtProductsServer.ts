import { McpServer } from "@modelcontextprotocol/server";
import type { ProductRepository } from "./productRepository.ts";
import { registerExplainPremiumCalculationTool } from "./tools/explainPremiumCalculationTool.ts";
import { registerGetDiscountRulesTool } from "./tools/getDiscountRulesTool.ts";
import { registerGetPremiumRulesTool } from "./tools/getPremiumRulesTool.ts";
import { registerGetProductTool } from "./tools/getProductTool.ts";
import { registerListProductsTool } from "./tools/listProductsTool.ts";

export const serverName = "duinzicht-products";
export const serverVersion = "1.0.0";

export const serverInstructions = `This server holds the product catalogue and the premium rules of Duinzicht Verzekeringen, a Dutch insurer. It is the only source of Duinzicht's products, rates, rating factors, modules, deductibles, discounts and conditions. Never use general knowledge about insurance prices and never invent a rate, factor, discount or condition: if a rule is not returned by these tools, it is not a Duinzicht rule, so say that it is missing.

Domain: customers hold policies for products. Product names are Dutch because they are shown to customers (for example "Doorlopende reisverzekering" is continuous travel insurance); everything else is English. Some products can be quoted online (quotableOnline true); the others are only described and have no premium rules. A monthly premium is calculated in a fixed order: base premium times rating factors, modules, deductible discount, package discount, minimum premium, insurance tax, rounding to cents. The order changes the result. The package discount depends on how many active Duinzicht policies the customer already holds; this server does not know customers or their policies, so that number must come from the customer's own policy data.

This server serves rules; it does not calculate a premium for a customer. Implement the calculation from the rules and check it against the worked examples.

Use the tools in this order:
1. list_products: every product with its code and whether it can be quoted online.
2. get_product: description, cover, exclusions and, for a product that can be quoted online, conditions (start of cover, waiting period, acceptance) of one product.
3. get_premium_rules: base premium, rating factors, modules, deductibles and the general rules of one product that can be quoted online.
4. get_discount_rules: the deductible discounts and the package discount, with exactly which policies count.
5. explain_premium_calculation: the calculation steps in order and worked examples with every intermediate amount, to use as test cases.

All amounts are euros per month as numbers. Percentages are numbers where 10 means 10%.`;

export function createDuinzichtProductsServer(repository: ProductRepository): McpServer {
  const server = new McpServer({ name: serverName, version: serverVersion }, { instructions: serverInstructions });

  registerListProductsTool(server, repository);
  registerGetProductTool(server, repository);
  registerGetPremiumRulesTool(server, repository);
  registerGetDiscountRulesTool(server, repository);
  registerExplainPremiumCalculationTool(server, repository);

  return server;
}
