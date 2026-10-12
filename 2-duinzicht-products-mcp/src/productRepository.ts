import { join } from "node:path";
import { z } from "zod";
import {
  premiumRulesFileSchema,
  productCatalogueFileSchema,
  workedExamplesFileSchema,
  type PremiumRulesFile,
  type Product,
  type ProductCatalogueFile,
  type ProductPremiumRules,
  type QuotableProduct,
  type WorkedExample,
  type WorkedExampleCustomer,
  type WorkedExamplesFile,
} from "./catalogueSchemas.ts";

export const productCatalogueFileName = "products.json";
export const premiumRulesFileName = "premium-rules.json";
export const workedExamplesFileName = "worked-examples.json";

export class ProductStoreError extends Error {
  constructor(fileName: string, problems: string[]) {
    super(`The product store file ${fileName} is not valid:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
    this.name = "ProductStoreError";
  }
}

export type GeneralPremiumRules = Omit<PremiumRulesFile, "formatVersion" | "productRules">;

export interface ProductRepository {
  readonly insurer: string;
  listProducts(): Product[];
  findProduct(productCode: string): Product | undefined;
  listQuotableProductCodes(): string[];
  findPremiumRules(productCode: string): ProductPremiumRules | undefined;
  getGeneralRules(): GeneralPremiumRules;
  getWorkedExampleCustomer(): WorkedExampleCustomer;
  listWorkedExamples(): WorkedExample[];
}

export async function loadProductRepository(dataDirectory: string): Promise<ProductRepository> {
  const catalogue = await readStoreFile(dataDirectory, productCatalogueFileName, productCatalogueFileSchema);
  const premiumRules = await readStoreFile(dataDirectory, premiumRulesFileName, premiumRulesFileSchema);
  const workedExamples = await readStoreFile(dataDirectory, workedExamplesFileName, workedExamplesFileSchema);

  throwIfProblems(productCatalogueFileName, findCatalogueProblems(catalogue));
  throwIfProblems(premiumRulesFileName, findPremiumRulesProblems(premiumRules, catalogue));
  throwIfProblems(workedExamplesFileName, findWorkedExampleProblems(workedExamples, premiumRules, catalogue));

  return createRepository(catalogue, premiumRules, workedExamples);
}

async function readStoreFile<Schema extends z.ZodType>(dataDirectory: string, fileName: string, schema: Schema): Promise<z.infer<Schema>> {
  const filePath = join(dataDirectory, fileName);
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new ProductStoreError(fileName, [`file not found at ${filePath}`]);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(await file.text());
  } catch (error) {
    throw new ProductStoreError(fileName, [`not valid JSON: ${error instanceof Error ? error.message : String(error)}`]);
  }

  const validation = schema.safeParse(parsedJson);
  if (!validation.success) {
    throw new ProductStoreError(fileName, validation.error.issues.map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`));
  }
  return validation.data;
}

function formatIssuePath(path: PropertyKey[]): string {
  if (path.length === 0) return "(whole file)";
  return path
    .map((segment, index) => (typeof segment === "number" ? `[${segment}]` : `${index === 0 ? "" : "."}${String(segment)}`))
    .join("");
}

function throwIfProblems(fileName: string, problems: string[]): void {
  if (problems.length > 0) throw new ProductStoreError(fileName, problems);
}

function findDuplicates(values: Array<string | number>): Array<string | number> {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function findCatalogueProblems(catalogue: ProductCatalogueFile): string[] {
  return findDuplicates(catalogue.products.map((product) => product.code)).map((code) => `product code "${code}" is used more than once`);
}

function findPremiumRulesProblems(premiumRules: PremiumRulesFile, catalogue: ProductCatalogueFile): string[] {
  const problems: string[] = [];

  premiumRules.calculationSteps.forEach((step, index) => {
    if (step.order !== index + 1) problems.push(`calculation step "${step.code}" has order ${step.order}, expected ${index + 1}`);
  });
  for (const duplicateCode of findDuplicates(premiumRules.calculationSteps.map((step) => step.code))) {
    problems.push(`calculation step "${duplicateCode}" is listed more than once`);
  }

  for (const product of catalogue.products.filter((candidate) => candidate.quotableOnline)) {
    const rulesForProduct = premiumRules.productRules.filter((rules) => rules.productCode === product.code);
    if (rulesForProduct.length !== 1) {
      problems.push(`product "${product.code}" can be quoted online and needs exactly one entry in productRules, found ${rulesForProduct.length}`);
    }
  }

  for (const rules of premiumRules.productRules) {
    const location = `productRules "${rules.productCode}"`;
    const product = catalogue.products.find((candidate) => candidate.code === rules.productCode);
    if (!product) {
      problems.push(`${location} refers to a product that is not in ${productCatalogueFileName}`);
    } else if (!product.quotableOnline) {
      problems.push(`${location} has rules, but the product is marked as not quotable online`);
    }

    for (const duplicateCode of findDuplicates(rules.ratingFactors.map((factor) => factor.code))) {
      problems.push(`${location} has rating factor "${duplicateCode}" more than once`);
    }
    for (const duplicateCode of findDuplicates(rules.modules.map((module) => module.code))) {
      problems.push(`${location} has module "${duplicateCode}" more than once`);
    }
    for (const duplicateAmount of findDuplicates(rules.deductibles.map((deductible) => deductible.amountInEuros))) {
      problems.push(`${location} has a deductible of ${duplicateAmount} euros more than once`);
    }
    const defaultDeductibleCount = rules.deductibles.filter((deductible) => deductible.isDefault).length;
    if (defaultDeductibleCount !== 1) {
      problems.push(`${location} needs exactly one default deductible, found ${defaultDeductibleCount}`);
    }

    for (const factor of rules.ratingFactors) {
      const factorLocation = `${location}, rating factor "${factor.code}"`;
      for (const duplicateCode of findDuplicates(factor.options.map((option) => option.code))) {
        problems.push(`${factorLocation} has option "${duplicateCode}" more than once`);
      }
      if (factor.kind === "band") {
        factor.options.forEach((option, index) => {
          const previousOption = factor.options[index - 1];
          if (previousOption && option.upToAndIncluding <= previousOption.upToAndIncluding) {
            problems.push(`${factorLocation} must list its bands in ascending order of upToAndIncluding`);
          }
        });
      }
      if (factor.kind === "postcode-area") {
        if (!factor.options.some((option) => option.code === factor.defaultOptionCode)) {
          problems.push(`${factorLocation} has defaultOptionCode "${factor.defaultOptionCode}", which is not one of its options`);
        }
        for (const duplicateArea of findDuplicates(factor.options.flatMap((option) => option.postcodeAreas))) {
          problems.push(`${factorLocation} lists postcode area "${duplicateArea}" in more than one option`);
        }
      }
    }
  }
  return problems;
}

function findWorkedExampleProblems(workedExamples: WorkedExamplesFile, premiumRules: PremiumRulesFile, catalogue: ProductCatalogueFile): string[] {
  const problems: string[] = [];
  const catalogueCodes = catalogue.products.map((product) => product.code);
  for (const activePolicy of workedExamples.customer.activePolicies) {
    if (!catalogueCodes.includes(activePolicy)) problems.push(`customer.activePolicies lists unknown product "${activePolicy}"`);
  }

  workedExamples.examples.forEach((example) => {
    const location = `example "${example.title}"`;
    const rules = premiumRules.productRules.find((candidate) => candidate.productCode === example.productCode);
    if (!rules) {
      problems.push(`${location} refers to a product without premium rules`);
      return;
    }

    const chosenFactorCodes = example.factorChoices.map((choice) => choice.factorCode);
    for (const factor of rules.ratingFactors) {
      const choiceCount = chosenFactorCodes.filter((code) => code === factor.code).length;
      if (choiceCount !== 1) problems.push(`${location} must choose rating factor "${factor.code}" exactly once, found ${choiceCount}`);
    }
    for (const choice of example.factorChoices) {
      const factor = rules.ratingFactors.find((candidate) => candidate.code === choice.factorCode);
      const option = factor?.options.find((candidate) => candidate.code === choice.optionCode);
      if (!factor) {
        problems.push(`${location} chooses unknown rating factor "${choice.factorCode}"`);
      } else if (!option) {
        problems.push(`${location} chooses unknown option "${choice.optionCode}" for rating factor "${choice.factorCode}"`);
      } else if (option.multiplier !== choice.multiplier) {
        problems.push(`${location} uses multiplier ${choice.multiplier} for "${choice.optionCode}", the rules say ${option.multiplier}`);
      }
    }
    for (const moduleCode of example.moduleCodes) {
      if (!rules.modules.some((module) => module.code === moduleCode)) problems.push(`${location} chooses unknown module "${moduleCode}"`);
    }
    if (!rules.deductibles.some((deductible) => deductible.amountInEuros === example.deductibleInEuros)) {
      problems.push(`${location} chooses a deductible of ${example.deductibleInEuros} euros, which the product does not offer`);
    }

    const stepCodes = example.steps.map((step) => step.code).join(", ");
    const expectedStepCodes = premiumRules.calculationSteps.map((step) => step.code).join(", ");
    if (stepCodes !== expectedStepCodes) problems.push(`${location} must list the steps ${expectedStepCodes} in that order, found ${stepCodes}`);
    const lastStep = example.steps.at(-1);
    if (lastStep && lastStep.amountInEuros !== example.monthlyPremiumInEuros) {
      problems.push(`${location} ends at ${lastStep.amountInEuros} euros, but monthlyPremiumInEuros is ${example.monthlyPremiumInEuros}`);
    }
  });
  return problems;
}

function createRepository(catalogue: ProductCatalogueFile, premiumRules: PremiumRulesFile, workedExamples: WorkedExamplesFile): ProductRepository {
  const { formatVersion, productRules, ...generalRules } = premiumRules;

  return {
    insurer: catalogue.insurer,
    listProducts: () => catalogue.products,
    findProduct: (productCode) => catalogue.products.find((product) => product.code === productCode),
    listQuotableProductCodes: () =>
      catalogue.products.filter((product): product is QuotableProduct => product.quotableOnline).map((product) => product.code),
    findPremiumRules: (productCode) => productRules.find((rules) => rules.productCode === productCode),
    getGeneralRules: () => generalRules,
    getWorkedExampleCustomer: () => workedExamples.customer,
    listWorkedExamples: () => workedExamples.examples,
  };
}
