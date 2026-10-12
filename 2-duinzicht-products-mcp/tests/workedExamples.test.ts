import { describe, expect, test } from "bun:test";
import { loadProductRepository } from "../src/productRepository.ts";
import { calculateMonthlyPremium } from "./support/referencePremiumCalculation.ts";
import { dataDirectory } from "./support/testServer.ts";

const repository = await loadProductRepository(dataDirectory);
const generalRules = repository.getGeneralRules();

function rulesFor(productCode: string) {
  const rules = repository.findPremiumRules(productCode);
  if (!rules) throw new Error(`No premium rules for ${productCode}`);
  return rules;
}

describe("worked examples", () => {
  for (const example of repository.listWorkedExamples()) {
    test(`${example.title}: every step equals the reference calculation`, () => {
      const result = calculateMonthlyPremium(rulesFor(example.productCode), generalRules, {
        factorInputs: Object.fromEntries(example.factorChoices.map((choice) => [choice.factorCode, choice.input])),
        moduleCodes: example.moduleCodes,
        deductibleInEuros: example.deductibleInEuros,
        activeDuinzichtPolicies: example.activeDuinzichtPolicies,
      });

      expect(result.resolvedOptions).toEqual(
        example.factorChoices.map(({ factorCode, optionCode, multiplier }) => ({ factorCode, optionCode, multiplier })),
      );
      for (const step of example.steps) {
        expect(step.amountInEuros).toBeCloseTo(result.amountAfterStep[step.code] ?? Number.NaN, 9);
      }
      expect(example.monthlyPremiumInEuros).toBe(result.monthlyPremiumInEuros);
    });
  }

  test("Sanne's examples use her household, her postcode and her 4 active policies", () => {
    const customer = repository.getWorkedExampleCustomer();
    expect(customer.name).toBe("Sanne de Vries");
    expect(customer.address.postcode).toBe("3521 AB");
    const sanneExamples = repository.listWorkedExamples().filter((example) => example.forWorkedExampleCustomer);
    expect(sanneExamples.map((example) => example.productCode)).toEqual(["reis", "rechtsbijstand", "fiets"]);
    for (const example of sanneExamples) {
      expect(example.activeDuinzichtPolicies).toBe(customer.activePolicies.length);
      for (const choice of example.factorChoices) {
        if (choice.factorCode === "household") expect(choice.input).toBe(customer.household);
        if (choice.factorCode === "housing-situation") expect(choice.input).toBe(customer.housingSituation);
        if (choice.factorCode === "theft-risk-zone") expect(choice.input).toBe(customer.address.postcode);
      }
    }
  });
});

describe("rounding", () => {
  test("a premium that ends exactly on half a cent rounds up, also when floating point would round it down", () => {
    const legalAidTie = calculateMonthlyPremium(rulesFor("rechtsbijstand"), generalRules, {
      factorInputs: { household: "single", "housing-situation": "owner", "legal-cases-last-five-years": "one" },
      moduleCodes: ["employment", "traffic"],
      deductibleInEuros: 0,
      activeDuinzichtPolicies: 2,
    });
    expect(legalAidTie.amountAfterStep["insurance-tax"]).toBe(27.225);
    expect(legalAidTie.monthlyPremiumInEuros).toBe(27.23);

    const travelTie = calculateMonthlyPremium(rulesFor("reis"), generalRules, {
      factorInputs: { "coverage-area": "europe", household: "single-parent", "maximum-trip-duration": "60-days" },
      moduleCodes: ["cancellation"],
      deductibleInEuros: 0,
      activeDuinzichtPolicies: 2,
    });
    expect(travelTie.monthlyPremiumInEuros).toBe(9.08);
  });

  test("the served examples include a half-cent case, a case without package discount and a case at the minimum premium", () => {
    const examples = repository.listWorkedExamples();
    const amountAfter = (example: (typeof examples)[number], stepCode: string) => example.steps.find((step) => step.code === stepCode)?.amountInEuros ?? Number.NaN;
    expect(examples.some((example) => Math.round(amountAfter(example, "insurance-tax") * 1000) % 10 === 5)).toBe(true);
    expect(examples.some((example) => example.activeDuinzichtPolicies < generalRules.packageDiscount.minimumActivePolicies)).toBe(true);
    expect(examples.some((example) => amountAfter(example, "package-discount") < generalRules.minimumMonthlyPremiumBeforeTaxInEuros)).toBe(true);
  });
});

describe("why the order matters", () => {
  test("the minimum premium is applied before tax, as the order notes say", () => {
    const result = calculateMonthlyPremium(rulesFor("fiets"), generalRules, {
      factorInputs: { "bike-type": "regular", "purchase-value": 800, "bike-age": 3, "theft-risk-zone": "8011 AB" },
      moduleCodes: [],
      deductibleInEuros: 100,
      activeDuinzichtPolicies: 4,
    });

    expect(result.amountAfterStep["package-discount"]).toBeCloseTo(1.54224, 9);
    expect(result.amountAfterStep["minimum-premium"]).toBe(3);
    expect(result.monthlyPremiumInEuros).toBe(3.63);
    expect(generalRules.orderNotes.join(" ")).toContain("1.54 euros is raised to 3.00 euros and then taxed to 3.63 euros");
  });

  test("a customer with 2 active policies gets no package discount", () => {
    const sanneTravelExample = repository.listWorkedExamples().find((example) => example.productCode === "reis");
    if (!sanneTravelExample) throw new Error("Missing the travel example");

    const result = calculateMonthlyPremium(rulesFor("reis"), generalRules, {
      factorInputs: Object.fromEntries(sanneTravelExample.factorChoices.map((choice) => [choice.factorCode, choice.input])),
      moduleCodes: sanneTravelExample.moduleCodes,
      deductibleInEuros: sanneTravelExample.deductibleInEuros,
      activeDuinzichtPolicies: 2,
    });

    expect(result.amountAfterStep["package-discount"]).toBe(result.amountAfterStep["deductible-discount"] ?? Number.NaN);
    expect(result.monthlyPremiumInEuros).toBe(8.71);
  });
});
