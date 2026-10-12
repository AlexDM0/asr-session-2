import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { calculationStepSchema, deductibleSchema, packageDiscountSchema, type CalculationStep } from "../catalogueSchemas.ts";
import type { ProductRepository } from "../productRepository.ts";
import { jsonToolResult, logToolCall, notQuotableProductErrorResult, readOnlyToolAnnotations } from "./toolResults.ts";

const discountStepCodes: Array<CalculationStep["code"]> = ["deductible-discount", "package-discount", "minimum-premium"];

const getDiscountRulesOutputSchema = z.object({
  packageDiscount: packageDiscountSchema,
  deductibleDiscounts: z.array(
    z.object({
      product: z.object({ code: z.string(), name: z.string() }),
      deductibles: z.array(deductibleSchema),
      deductibleAppliesTo: z.string(),
    }),
  ),
  minimumMonthlyPremiumBeforeTaxInEuros: z.number(),
  discountSteps: z.array(calculationStepSchema),
});

export function registerGetDiscountRulesTool(server: McpServer, repository: ProductRepository): void {
  const quotableProductCodes = repository.listQuotableProductCodes();

  server.registerTool(
    "get_discount_rules",
    {
      title: "Get the discount rules",
      description:
        "Returns the discounts Duinzicht Verzekeringen gives on a monthly premium. There are two: a deductible discount (a customer who accepts a higher deductible, the amount they pay themselves per claim, gets a percentage off) and a package discount (a percentage off for customers who already hold a minimum number of active Duinzicht policies; the rule says exactly which policies count). Also returns the minimum premium that limits the discounts and the calculation steps that apply them, in order. To check the package discount for a customer you need the number of active policies that customer holds; this server does not know customers, so take that number from the customer's own policy data. Leave productCode out to get the deductible discounts of every product that can be quoted online.",
      inputSchema: z.object({
        productCode: z
          .string()
          .optional()
          .describe(`Optional: limit the deductible discounts to one product that can be quoted online: ${quotableProductCodes.join(", ")}`),
      }),
      outputSchema: getDiscountRulesOutputSchema,
      annotations: readOnlyToolAnnotations,
    },
    async ({ productCode }) => {
      logToolCall("get_discount_rules", productCode ? { productCode } : {});
      if (productCode && !quotableProductCodes.includes(productCode)) return notQuotableProductErrorResult(productCode, repository);
      const generalRules = repository.getGeneralRules();
      const selectedProductCodes = productCode ? [productCode] : quotableProductCodes;

      const deductibleDiscounts = selectedProductCodes.flatMap((selectedProductCode) => {
        const product = repository.findProduct(selectedProductCode);
        const rules = repository.findPremiumRules(selectedProductCode);
        if (!product || !rules) return [];
        return [{ product: { code: product.code, name: product.name }, deductibles: rules.deductibles, deductibleAppliesTo: rules.deductibleAppliesTo }];
      });

      return jsonToolResult({
        packageDiscount: generalRules.packageDiscount,
        deductibleDiscounts,
        minimumMonthlyPremiumBeforeTaxInEuros: generalRules.minimumMonthlyPremiumBeforeTaxInEuros,
        discountSteps: generalRules.calculationSteps.filter((step) => discountStepCodes.includes(step.code)),
      });
    },
  );
}
