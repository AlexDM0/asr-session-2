import type { ProductPremiumRules, RatingFactor } from "../../src/catalogueSchemas.ts";
import type { GeneralPremiumRules } from "../../src/productRepository.ts";

// An independent implementation of the rules in exact decimals, used only to check the worked examples in the data.

export interface PremiumCalculationInput {
  factorInputs: Record<string, string | number>;
  moduleCodes: string[];
  deductibleInEuros: number;
  activeDuinzichtPolicies: number;
}

export interface PremiumCalculationResult {
  resolvedOptions: Array<{ factorCode: string; optionCode: string; multiplier: number }>;
  amountAfterStep: Record<string, number>;
  monthlyPremiumInEuros: number;
}

export function resolveFactorOption(factor: RatingFactor, input: string | number): { code: string; multiplier: number } {
  switch (factor.kind) {
    case "choice": {
      const option = factor.options.find((candidate) => candidate.code === input);
      if (!option) throw new Error(`No option "${input}" for factor ${factor.code}`);
      return option;
    }
    case "band": {
      const option = factor.options.find((candidate) => Number(input) <= candidate.upToAndIncluding);
      if (!option) throw new Error(`${input} is above the highest band of factor ${factor.code}`);
      return option;
    }
    case "postcode-area": {
      const postcodeArea = String(input).slice(0, 2);
      const option =
        factor.options.find((candidate) => candidate.postcodeAreas.includes(postcodeArea)) ??
        factor.options.find((candidate) => candidate.code === factor.defaultOptionCode);
      if (!option) throw new Error(`No default option for factor ${factor.code}`);
      return option;
    }
  }
}

// Every amount is an integer of digits plus a number of decimal places, so 27.225 stays 27.225 instead of 27.22499999.
interface ExactDecimal {
  digits: bigint;
  decimalPlaces: number;
}

function toExactDecimal(value: number): ExactDecimal {
  const written = String(value);
  if (!/^\d+(\.\d+)?$/.test(written)) throw new Error(`${written} is not a plain non-negative decimal`);
  const [wholePart = "", fractionPart = ""] = written.split(".");
  return { digits: BigInt(wholePart + fractionPart), decimalPlaces: fractionPart.length };
}

function withDecimalPlaces(value: ExactDecimal, decimalPlaces: number): bigint {
  return value.digits * 10n ** BigInt(decimalPlaces - value.decimalPlaces);
}

function addExact(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const decimalPlaces = Math.max(left.decimalPlaces, right.decimalPlaces);
  return { digits: withDecimalPlaces(left, decimalPlaces) + withDecimalPlaces(right, decimalPlaces), decimalPlaces };
}

function multiplyExact(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  return { digits: left.digits * right.digits, decimalPlaces: left.decimalPlaces + right.decimalPlaces };
}

function maximumExact(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const decimalPlaces = Math.max(left.decimalPlaces, right.decimalPlaces);
  return withDecimalPlaces(left, decimalPlaces) >= withDecimalPlaces(right, decimalPlaces) ? left : right;
}

function percentageAsFactor(percentage: number): ExactDecimal {
  const exactPercentage = toExactDecimal(percentage);
  return { digits: exactPercentage.digits, decimalPlaces: exactPercentage.decimalPlaces + 2 };
}

function oneMinusPercentage(percentage: number): ExactDecimal {
  const percentageFactor = percentageAsFactor(percentage);
  return { digits: 10n ** BigInt(percentageFactor.decimalPlaces) - percentageFactor.digits, decimalPlaces: percentageFactor.decimalPlaces };
}

function onePlusPercentage(percentage: number): ExactDecimal {
  return addExact(toExactDecimal(1), percentageAsFactor(percentage));
}

function exactDecimalToNumber(value: ExactDecimal): number {
  const written = value.digits.toString().padStart(value.decimalPlaces + 1, "0");
  const wholePart = written.slice(0, written.length - value.decimalPlaces);
  const fractionPart = written.slice(written.length - value.decimalPlaces);
  return Number(fractionPart ? `${wholePart}.${fractionPart}` : wholePart);
}

function roundHalfUpToCents(amount: ExactDecimal): ExactDecimal {
  if (amount.decimalPlaces <= 2) return amount;
  const divisor = 10n ** BigInt(amount.decimalPlaces - 2);
  return { digits: (amount.digits + divisor / 2n) / divisor, decimalPlaces: 2 };
}

export function calculateMonthlyPremium(
  productRules: ProductPremiumRules,
  generalRules: GeneralPremiumRules,
  input: PremiumCalculationInput,
): PremiumCalculationResult {
  const resolvedOptions = productRules.ratingFactors.map((factor) => {
    const factorInput = input.factorInputs[factor.code];
    if (factorInput === undefined) throw new Error(`Missing input for factor ${factor.code}`);
    const option = resolveFactorOption(factor, factorInput);
    return { factorCode: factor.code, optionCode: option.code, multiplier: option.multiplier };
  });

  const afterFactors = resolvedOptions.reduce(
    (amount, option) => multiplyExact(amount, toExactDecimal(option.multiplier)),
    toExactDecimal(productRules.baseMonthlyPremiumInEuros),
  );

  const modulePrices = input.moduleCodes.map((moduleCode) => {
    const productModule = productRules.modules.find((candidate) => candidate.code === moduleCode);
    if (!productModule) throw new Error(`Unknown module ${moduleCode}`);
    return toExactDecimal(productModule.monthlyPriceInEuros);
  });
  const afterModules = modulePrices.reduce(addExact, afterFactors);

  const deductible = productRules.deductibles.find((candidate) => candidate.amountInEuros === input.deductibleInEuros);
  if (!deductible) throw new Error(`No deductible of ${input.deductibleInEuros} euros`);
  const afterDeductibleDiscount = multiplyExact(afterModules, oneMinusPercentage(deductible.discountPercentage));

  const qualifiesForPackageDiscount = input.activeDuinzichtPolicies >= generalRules.packageDiscount.minimumActivePolicies;
  const afterPackageDiscount = qualifiesForPackageDiscount
    ? multiplyExact(afterDeductibleDiscount, oneMinusPercentage(generalRules.packageDiscount.discountPercentage))
    : afterDeductibleDiscount;

  const afterMinimumPremium = maximumExact(afterPackageDiscount, toExactDecimal(generalRules.minimumMonthlyPremiumBeforeTaxInEuros));
  const afterInsuranceTax = multiplyExact(afterMinimumPremium, onePlusPercentage(generalRules.insuranceTaxPercentage));
  const monthlyPremiumInEuros = exactDecimalToNumber(roundHalfUpToCents(afterInsuranceTax));

  return {
    resolvedOptions,
    amountAfterStep: {
      "base-and-factors": exactDecimalToNumber(afterFactors),
      modules: exactDecimalToNumber(afterModules),
      "deductible-discount": exactDecimalToNumber(afterDeductibleDiscount),
      "package-discount": exactDecimalToNumber(afterPackageDiscount),
      "minimum-premium": exactDecimalToNumber(afterMinimumPremium),
      "insurance-tax": exactDecimalToNumber(afterInsuranceTax),
      rounding: monthlyPremiumInEuros,
    },
    monthlyPremiumInEuros,
  };
}
