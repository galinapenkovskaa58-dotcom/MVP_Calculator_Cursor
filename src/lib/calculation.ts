import { services, type Category } from "../data/pricing.js";

export type CalculationInput = {
  category: Category;
  quantity: number;
  urgency: "low" | "medium" | "high";
  complexity: "simple" | "normal" | "complex";
  revisions: "none" | "limited" | "many";
  turnkey: boolean;
  userLevel?: "novice" | "experienced" | "specialist";
  hourlyRate: number;
};

export type CalculationResult = {
  serviceName: string;
  baseHours: number;
  effectiveHours: number;
  coefficients: {
    urgency: number;
    complexity: number;
    revisions: number;
    turnkey: number;
    quantity: number;
    level: number;
  };
  total: number;
};

const urgencyCoef = { low: 1, medium: 1.15, high: 1.35 };
const complexityCoef = { simple: 0.9, normal: 1, complex: 1.35 };
const revisionCoef = { none: 1, limited: 1.1, many: 1.25 };
const levelCoef = { novice: 0.7, experienced: 1, specialist: 1.2 };

export function calculatePrice(input: CalculationInput): CalculationResult {
  const service = services[input.category];
  const quantity = Math.max(1, input.quantity || 1);
  const turnkey = input.turnkey ? 1.2 : 1;
  const level = levelCoef[input.userLevel || "experienced"];

  const coeffs = {
    urgency: urgencyCoef[input.urgency],
    complexity: complexityCoef[input.complexity],
    revisions: revisionCoef[input.revisions],
    turnkey,
    quantity,
    level
  };

  const effectiveHours =
    service.baseHours *
    coeffs.quantity *
    coeffs.urgency *
    coeffs.complexity *
    coeffs.revisions *
    coeffs.turnkey *
    coeffs.level;

  const total = Math.round(effectiveHours * input.hourlyRate);

  return {
    serviceName: service.name,
    baseHours: service.baseHours,
    effectiveHours: Number(effectiveHours.toFixed(2)),
    coefficients: coeffs,
    total
  };
}
