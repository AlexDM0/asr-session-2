import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  calculationStepSchema,
  deductibleSchema,
  packageDiscountSchema,
  productModuleSchema,
  ratingFactorSchema,
  roundingSchema,
} from "../catalogueSchemas.ts";
import type { ProductRepository } from "../productRepository.ts";
import { jsonToolResult, logToolCall, notQuotableProductErrorResult, readOnlyToolAnnotations } from "./toolResults.ts";

const getPremiumRulesOutputSchema = z.object({
  product: z.object({ code: z.string(), name: z.string() }),
  currency: z.string(),
  premiumPeriod: z.string(),
  baseMonthlyPremiumInEuros: z.number(),
  ratingFactors: z.array(ratingFactorSchema),
  modules: z.array(productModuleSchema),
  deductibles: z.array(deductibleSchema),
  deductibleAppliesTo: z.string(),
  calculationSteps: z.array(calculationStepSchema),
  orderNotes: z.array(z.string()),
  packageDiscount: packageDiscountSchema,
  minimumMonthlyPremiumBeforeTaxInEuros: z.number(),
  insuranceTaxPercentage: z.number(),
  rounding: roundingSchema,
});

export function registerGetPremiumRulesTool(server: McpServer, repository: ProductRepository): void {
  const quotableProductCodes = repository.listQuotableProductCodes();

  server.registerTool(
    "get_premium_rules",
    {
      title: "Get the premium rules of a product",
      description:
        "Returns everything needed to calculate the monthly premium of one Duinzicht Verzekeringen product that can be quoted online: the base monthly premium in euros, the rating factors (each with options and a multiplier; kind 'choice' is picked by code, kind 'band' by the first option whose upToAndIncluding is at least the customer's number, kind 'postcode-area' by the first two digits of the Dutch postcode), the optional modules with a fixed monthly price, the deductible choices with their discount percentage, and the rules that apply to every product (package discount, minimum premium, insurance tax, rounding) with the fixed order of calculation. Amounts are euros per month as numbers; percentages are numbers where 10 means 10%. Follow calculationSteps in order; the order changes the result.",
      inputSchema: z.object({
        productCode: z.string().describe(`Code of a product that can be quoted online: ${quotableProductCodes.join(", ")}`),
      }),
      outputSchema: getPremiumRulesOutputSchema,
      annotations: readOnlyToolAnnotations,
    },
    async ({ productCode }) => {
      logToolCall("get_premium_rules", { productCode });
      const product = repository.findProduct(productCode);
      const rules = repository.findPremiumRules(productCode);
      if (!product || !rules) return notQuotableProductErrorResult(productCode, repository);

      return jsonToolResult({
        product: { code: product.code, name: product.name },
        baseMonthlyPremiumInEuros: rules.baseMonthlyPremiumInEuros,
        ratingFactors: rules.ratingFactors,
        modules: rules.modules,
        deductibles: rules.deductibles,
        deductibleAppliesTo: rules.deductibleAppliesTo,
        ...repository.getGeneralRules(),
      });
    },
  );
}
