import { afterEach, describe, expect, test } from "bun:test";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadProductRepository,
  premiumRulesFileName,
  productCatalogueFileName,
  ProductStoreError,
  workedExamplesFileName,
} from "../src/productRepository.ts";
import { dataDirectory } from "./support/testServer.ts";

const copiedDataDirectories: string[] = [];

async function copyDataDirectory(): Promise<string> {
  const copiedDataDirectory = await mkdtemp(join(tmpdir(), "duinzicht-products-store-"));
  copiedDataDirectories.push(copiedDataDirectory);
  await cp(dataDirectory, copiedDataDirectory, { recursive: true });
  return copiedDataDirectory;
}

async function editJsonFile(directory: string, fileName: string, edit: (json: any) => void): Promise<void> {
  const filePath = join(directory, fileName);
  const json = await Bun.file(filePath).json();
  edit(json);
  await Bun.write(filePath, JSON.stringify(json));
}

async function loadErrorMessage(directory: string): Promise<string> {
  try {
    await loadProductRepository(directory);
  } catch (error) {
    expect(error).toBeInstanceOf(ProductStoreError);
    return (error as Error).message;
  }
  throw new Error("Expected the product store to be rejected");
}

afterEach(async () => {
  await Promise.all(copiedDataDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("product store", () => {
  test("loads and validates the shipped data", async () => {
    const repository = await loadProductRepository(dataDirectory);

    expect(repository.insurer).toBe("Duinzicht Verzekeringen");
    expect(repository.listProducts().map((product) => product.code)).toEqual([
      "woonhuis",
      "inboedel",
      "auto",
      "aansprakelijkheid",
      "reis",
      "rechtsbijstand",
      "fiets",
    ]);
    expect(repository.listQuotableProductCodes()).toEqual(["reis", "rechtsbijstand", "fiets"]);
    expect(repository.listWorkedExamples().map((example) => example.productCode)).toEqual(["reis", "rechtsbijstand", "fiets", "reis", "fiets"]);
  });

  test("marks Sanne's current products as not quotable online", async () => {
    const repository = await loadProductRepository(dataDirectory);
    for (const productCode of ["woonhuis", "inboedel", "auto", "aansprakelijkheid"]) {
      const product = repository.findProduct(productCode);
      expect(product?.quotableOnline).toBe(false);
      expect(repository.findPremiumRules(productCode)).toBeUndefined();
    }
  });

  test("gives every quotable product 3 to 5 rating factors, deductible choices and conditions", async () => {
    const repository = await loadProductRepository(dataDirectory);
    for (const productCode of repository.listQuotableProductCodes()) {
      const rules = repository.findPremiumRules(productCode);
      expect(rules?.ratingFactors.length).toBeGreaterThanOrEqual(3);
      expect(rules?.ratingFactors.length).toBeLessThanOrEqual(5);
      expect(rules?.deductibles.length).toBeGreaterThan(1);
      const product = repository.findProduct(productCode);
      expect(product?.quotableOnline && product.conditions.waitingPeriod).toBeTruthy();
    }
  });

  test("lists the calculation steps in the agreed order", async () => {
    const repository = await loadProductRepository(dataDirectory);
    expect(repository.getGeneralRules().calculationSteps.map((step) => step.code)).toEqual([
      "base-and-factors",
      "modules",
      "deductible-discount",
      "package-discount",
      "minimum-premium",
      "insurance-tax",
      "rounding",
    ]);
  });

  test("rejects a file that is missing", async () => {
    const directory = await copyDataDirectory();
    await rm(join(directory, workedExamplesFileName));
    expect(await loadErrorMessage(directory)).toContain(`${workedExamplesFileName} is not valid:\n  - file not found`);
  });

  test("rejects a file that is not JSON", async () => {
    const directory = await copyDataDirectory();
    await Bun.write(join(directory, productCatalogueFileName), "{ not json");
    expect(await loadErrorMessage(directory)).toContain(`${productCatalogueFileName} is not valid:\n  - not valid JSON`);
  });

  test("rejects a field with the wrong type and names the path", async () => {
    const directory = await copyDataDirectory();
    await editJsonFile(directory, premiumRulesFileName, (json) => {
      json.productRules[0].baseMonthlyPremiumInEuros = "3.40";
    });
    const message = await loadErrorMessage(directory);
    expect(message).toContain(premiumRulesFileName);
    expect(message).toContain("productRules[0].baseMonthlyPremiumInEuros");
  });

  test("rejects premium rules for a product that is not in the catalogue", async () => {
    const directory = await copyDataDirectory();
    await editJsonFile(directory, premiumRulesFileName, (json) => {
      json.productRules[0].productCode = "scooter";
    });
    expect(await loadErrorMessage(directory)).toContain(`productRules "scooter" refers to a product that is not in ${productCatalogueFileName}`);
  });

  test("rejects a worked example whose multiplier differs from the rules", async () => {
    const directory = await copyDataDirectory();
    await editJsonFile(directory, workedExamplesFileName, (json) => {
      json.examples[0].factorChoices[1].multiplier = 2;
    });
    expect(await loadErrorMessage(directory)).toContain(`uses multiplier 2 for "family", the rules say 1.95`);
  });
});
