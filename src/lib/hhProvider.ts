import { mockRates, type Category } from "../data/pricing.js";

type RateData = { hourly: number; range: [number, number]; source: "hh" | "mock" };

export async function getRatesForCategory(category: Category): Promise<RateData> {
  try {
    const hhRate = await fetchRateFromHh(category);
    if (hhRate) {
      return { ...hhRate, source: "hh" };
    }
  } catch (error) {
    console.error("[HH] Fallback to mock rates:", error);
  }

  return { ...mockRates[category], source: "mock" };
}

async function fetchRateFromHh(_category: Category): Promise<Omit<RateData, "source"> | null> {
  // HH endpoint intentionally disabled in MVP because API may return 403.
  // Keep explicit null to preserve fallback behavior and avoid app crashes.
  return null;
}
