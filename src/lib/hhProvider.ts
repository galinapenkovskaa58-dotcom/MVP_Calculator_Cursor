import { mockRates, type Category } from "../data/pricing.js";

type RateData = {
  hourly: number;
  range: [number, number];
  rangeType: "project" | "hourly";
  source: "hh" | "mock";
};

type CachedRate = {
  value: RateData;
  expiresAt: number;
};

const HH_CACHE_TTL_MS = 60 * 60 * 1000;
const hhRateCache = new Map<Category, CachedRate>();

export async function getRatesForCategory(category: Category): Promise<RateData> {
  const cached = hhRateCache.get(category);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const hhRate = await fetchRateFromHh(category);
    if (hhRate) {
      const value: RateData = { ...hhRate, rangeType: "hourly", source: "hh" };
      hhRateCache.set(category, { value, expiresAt: now + HH_CACHE_TTL_MS });
      return value;
    }
  } catch (error) {
    console.error("[HH] Fallback to mock rates:", error);
  }

  const value: RateData = { ...mockRates[category], rangeType: "project", source: "mock" };
  hhRateCache.set(category, { value, expiresAt: now + HH_CACHE_TTL_MS });
  return value;
}

const hhQueries: Record<Category, string> = {
  copywriting: "копирайтер контент",
  social_media: "smm менеджер",
  design: "графический дизайнер",
  video_editing: "видеомонтажер монтажер reels",
  analytics: "маркетинговый аналитик",
  chatbot_setup: "специалист чат-бот",
  landing_page: "web разработчик лендинг",
  consultation: "бизнес консультант маркетинг"
};

async function fetchRateFromHh(category: Category): Promise<Omit<RateData, "source" | "rangeType"> | null> {
  const query = encodeURIComponent(hhQueries[category]);
  const url = `https://api.hh.ru/vacancies?text=${query}&search_field=name&per_page=40&only_with_salary=true`;
  const response = await fetch(url, {
    headers: { "User-Agent": "MVP-Calculator/1.0 (educational project)" }
  });

  if (!response.ok) {
    throw new Error(`HH response status: ${response.status}`);
  }

  const payload = (await response.json()) as {
    items?: Array<{
      salary?: { from?: number | null; to?: number | null; currency?: string | null };
    }>;
  };

  const monthlySalaries = (payload.items || [])
    .map((item) => item.salary)
    .filter((salary): salary is { from?: number | null; to?: number | null; currency?: string | null } => Boolean(salary))
    .filter((salary) => salary.currency === "RUR")
    .map((salary) => {
      const from = Number(salary.from || 0);
      const to = Number(salary.to || 0);
      if (from > 0 && to > 0) return (from + to) / 2;
      return from || to || 0;
    })
    .filter((value) => value > 0)
    .sort((a, b) => a - b);

  if (monthlySalaries.length < 6) {
    return null;
  }

  const p25 = percentile(monthlySalaries, 0.25);
  const p50 = percentile(monthlySalaries, 0.5);
  const p75 = percentile(monthlySalaries, 0.75);

  const hourlyMedian = Math.round(p50 / 160);
  const hourlyRange: [number, number] = [Math.round(p25 / 160), Math.round(p75 / 160)];

  if (hourlyMedian <= 0 || hourlyRange[0] <= 0 || hourlyRange[1] <= 0) {
    return null;
  }

  return { hourly: hourlyMedian, range: hourlyRange };
}

function percentile(data: number[], p: number): number {
  if (data.length === 0) {
    return 0;
  }
  const index = (data.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return data[lower];
  }
  const weight = index - lower;
  return data[lower] * (1 - weight) + data[upper] * weight;
}
