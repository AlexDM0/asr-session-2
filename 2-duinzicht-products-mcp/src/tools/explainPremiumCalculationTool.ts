import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { calculationStepSchema, packageDiscountSchema, roundingSchema, workedExampleCustomerSchema, workedExampleSchema } from "../catalogueSchemas.ts";
import type { ProductRepository } from "../productRepository.ts";
import { jsonToolResult, logToolCall, notQuotableProductErrorResult, readOnlyToolAnnotations } from "./toolResults.ts";

const explainPremiumCalculationOutputSchema = z.object({
  calculationSteps: z.array(calculationStepSchema),
  orderNotes: z.array(z.string()),
  packageDiscount: packageDiscountSchema,
  minimumMonthlyPremiumBeforeTaxInEuros: z.number(),
  insuranceTaxPercentage: z.number(),
  rounding: roundingSchema,
  workedExampleCustomer: workedExampleCustomerSchema,
  workedExamples: z.array(workedExampleSchema),
  howToUseTheExamples: z.string(),
});

export function registerExplainPremiumCalculationTool(server: McpServer, repository: ProductRepository): void {
  const quotableProductCodes = repository.listQuotableProductCodes();

  server.registerTool(
    "explain_premium_calculation",
    {
      title: "Explain the premium calculation",
      description:
        "Explains how Duinzicht Verzekeringen calculates a monthly premium: the calculation steps in their fixed order (base premium times rating factors, modules, deductible discount, package discount, minimum premium, insurance tax, rounding), notes on why the order matters, and worked examples with every input, every intermediate amount and the final monthly premium: quotes for the customer Sanne de Vries, plus examples for other customers that check the edge cases (no package discount, the minimum premium, a half cent in the rounding). Use the worked examples as test cases: an implementation of the rules must produce exactly the same amounts. Leave productCode out to get the examples for every product that can be quoted online. The rates themselves come from get_premium_rules.",
      inputSchema: z.object({
        productCode: z
          .string()
          .optional()
          .describe(`Optional: only the worked examples for this product that can be quoted online: ${quotableProductCodes.join(", ")}`),
      }),
      outputSchema: explainPremiumCalculationOutputSchema,
      annotations: readOnlyToolAnnotations,
    },
    async ({ productCode }) => {
      logToolCall("explain_premium_calculation", productCode ? { productCode } : {});
      if (productCode && !quotableProductCodes.includes(productCode)) return notQuotableProductErrorResult(productCode, repository);
      const { calculationSteps, orderNotes, packageDiscount, minimumMonthlyPremiumBeforeTaxInEuros, insuranceTaxPercentage, rounding } =
        repository.getGeneralRules();

      return jsonToolResult({
        calculationSteps,
        orderNotes,
        packageDiscount,
        minimumMonthlyPremiumBeforeTaxInEuros,
        insuranceTaxPercentage,
        rounding,
        workedExampleCustomer: repository.getWorkedExampleCustomer(),
        workedExamples: repository.listWorkedExamples().filter((example) => !productCode || example.productCode === productCode),
        howToUseTheExamples:
          "Each example lists the customer's inputs, the option every input resolves to, and the amount after every step. whatItChecks says which rule the example tests; forWorkedExampleCustomer is false for an example that is not a quote for workedExampleCustomer. Intermediate amounts are not rounded; only step 7 rounds to cents. Use every example as a test case for an implementation.",
      });
    },
  );
}
