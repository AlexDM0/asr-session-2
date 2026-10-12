import { z } from "zod";

const productCode = z.string().regex(/^[a-z][a-z-]*$/, "use lowercase letters and hyphens");
const optionCode = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "use lowercase letters, digits and hyphens");
const nonEmptyText = z.string().trim().min(1);
const amountInEuros = z.number().nonnegative();
const percentage = z.number().min(0).max(100);
const multiplier = z.number().positive();

export const productCategorySchema = z.enum(["property", "vehicle", "liability", "travel", "legal", "bike"]);

const productBaseSchema = z.object({
  code: productCode,
  name: nonEmptyText.describe("Dutch product name, as shown to customers"),
  category: productCategorySchema,
  summary: nonEmptyText,
  description: nonEmptyText,
  cover: z.array(nonEmptyText).min(1),
  exclusions: z.array(nonEmptyText),
});

export const productConditionsSchema = z.object({
  coverageStart: nonEmptyText,
  waitingPeriod: nonEmptyText,
  acceptance: z.array(nonEmptyText),
});

export const describedOnlyProductSchema = productBaseSchema.extend({
  quotableOnline: z.literal(false),
  notQuotableReason: nonEmptyText,
});

export const quotableProductSchema = productBaseSchema.extend({
  quotableOnline: z.literal(true),
  conditions: productConditionsSchema,
});

export const productSchema = z.discriminatedUnion("quotableOnline", [describedOnlyProductSchema, quotableProductSchema]);

export const productCatalogueFileSchema = z.object({
  formatVersion: z.literal(1),
  insurer: nonEmptyText,
  products: z.array(productSchema).min(1),
});

const factorBaseSchema = z.object({
  code: optionCode,
  name: nonEmptyText,
  description: nonEmptyText,
});

export const choiceFactorSchema = factorBaseSchema.extend({
  kind: z.literal("choice"),
  options: z.array(z.object({ code: optionCode, label: nonEmptyText, multiplier })).min(2),
});

export const bandFactorSchema = factorBaseSchema.extend({
  kind: z.literal("band"),
  unit: z.enum(["euros", "years"]),
  options: z
    .array(z.object({ code: optionCode, label: nonEmptyText, upToAndIncluding: z.number().nonnegative(), multiplier }))
    .min(2),
});

export const postcodeAreaFactorSchema = factorBaseSchema.extend({
  kind: z.literal("postcode-area"),
  defaultOptionCode: optionCode,
  options: z
    .array(
      z.object({
        code: optionCode,
        label: nonEmptyText,
        postcodeAreas: z.array(z.string().regex(/^[1-9][0-9]$/, "a postcode area is the first two digits of a Dutch postcode")),
        multiplier,
      }),
    )
    .min(2),
});

export const ratingFactorSchema = z.discriminatedUnion("kind", [choiceFactorSchema, bandFactorSchema, postcodeAreaFactorSchema]);

export const productModuleSchema = z.object({
  code: optionCode,
  name: nonEmptyText,
  description: nonEmptyText,
  monthlyPriceInEuros: amountInEuros,
});

export const deductibleSchema = z.object({
  amountInEuros,
  discountPercentage: percentage,
  isDefault: z.boolean(),
});

export const productPremiumRulesSchema = z.object({
  productCode,
  baseMonthlyPremiumInEuros: amountInEuros,
  ratingFactors: z.array(ratingFactorSchema).min(3).max(5),
  modules: z.array(productModuleSchema),
  deductibles: z.array(deductibleSchema).min(1),
  deductibleAppliesTo: nonEmptyText,
});

export const calculationStepCodeSchema = z.enum([
  "base-and-factors",
  "modules",
  "deductible-discount",
  "package-discount",
  "minimum-premium",
  "insurance-tax",
  "rounding",
]);

export const calculationStepSchema = z.object({
  order: z.int().positive(),
  code: calculationStepCodeSchema,
  name: nonEmptyText,
  rule: nonEmptyText,
});

export const packageDiscountSchema = z.object({
  name: nonEmptyText,
  discountPercentage: percentage,
  minimumActivePolicies: z.int().positive(),
  rule: nonEmptyText,
  whatCounts: z.array(nonEmptyText).min(1),
  appliesTo: nonEmptyText,
});

export const roundingSchema = z.object({
  decimals: z.int().nonnegative(),
  method: z.literal("half-up"),
  rule: nonEmptyText,
});

export const premiumRulesFileSchema = z.object({
  formatVersion: z.literal(1),
  currency: z.literal("EUR"),
  premiumPeriod: z.literal("month"),
  calculationSteps: z.array(calculationStepSchema).length(calculationStepCodeSchema.options.length),
  orderNotes: z.array(nonEmptyText),
  packageDiscount: packageDiscountSchema,
  minimumMonthlyPremiumBeforeTaxInEuros: amountInEuros,
  insuranceTaxPercentage: percentage,
  rounding: roundingSchema,
  productRules: z.array(productPremiumRulesSchema).min(1),
});

export const workedExampleCustomerSchema = z.object({
  name: nonEmptyText,
  birthDate: z.iso.date(),
  address: z.object({ streetAndHouseNumber: nonEmptyText, postcode: z.string().regex(/^[1-9][0-9]{3} [A-Z]{2}$/), city: nonEmptyText }),
  household: optionCode,
  housingSituation: optionCode,
  activePolicies: z.array(productCode),
  notes: nonEmptyText,
});

export const workedExampleStepSchema = z.object({
  order: z.int().positive(),
  code: calculationStepCodeSchema,
  calculation: nonEmptyText,
  amountInEuros,
});

export const workedExampleSchema = z.object({
  productCode,
  title: nonEmptyText,
  forWorkedExampleCustomer: z.boolean().describe("True when the example is a quote for the worked-example customer, false for another customer"),
  whatItChecks: nonEmptyText,
  factorChoices: z.array(
    z.object({
      factorCode: optionCode,
      input: z.union([z.string(), z.number()]).describe("What the customer entered: an option code, a number, or a postcode"),
      optionCode,
      multiplier,
    }),
  ),
  moduleCodes: z.array(optionCode),
  deductibleInEuros: amountInEuros,
  activeDuinzichtPolicies: z.int().nonnegative(),
  steps: z.array(workedExampleStepSchema),
  monthlyPremiumInEuros: amountInEuros,
});

export const workedExamplesFileSchema = z.object({
  formatVersion: z.literal(1),
  customer: workedExampleCustomerSchema,
  examples: z.array(workedExampleSchema),
});

export type Product = z.infer<typeof productSchema>;
export type QuotableProduct = z.infer<typeof quotableProductSchema>;
export type ProductCatalogueFile = z.infer<typeof productCatalogueFileSchema>;
export type RatingFactor = z.infer<typeof ratingFactorSchema>;
export type ProductPremiumRules = z.infer<typeof productPremiumRulesSchema>;
export type PremiumRulesFile = z.infer<typeof premiumRulesFileSchema>;
export type CalculationStep = z.infer<typeof calculationStepSchema>;
export type WorkedExample = z.infer<typeof workedExampleSchema>;
export type WorkedExampleCustomer = z.infer<typeof workedExampleCustomerSchema>;
export type WorkedExamplesFile = z.infer<typeof workedExamplesFileSchema>;
