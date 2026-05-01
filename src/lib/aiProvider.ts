import OpenAI from "openai";
import { services, type Category } from "../data/pricing.js";
import { detectCategoryByKeywords } from "./matching.js";

export type AnalyzeTaskResult = {
  category: Category;
  service: string;
  quantity: number;
  needsClarification: boolean;
  source: "openai" | "mock";
};

type ParsedResult = Omit<AnalyzeTaskResult, "source">;

const categoryList: Category[] = [
  "copywriting",
  "social_media",
  "design",
  "video_editing",
  "analytics",
  "chatbot_setup",
  "landing_page",
  "consultation"
];

export async function analyzeTask(inputText: string): Promise<AnalyzeTaskResult> {
  const fallback = fallbackAnalyze(inputText);

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Ты помощник для оценки фриланс-задач. Верни строго JSON с полями category, service, quantity, needsClarification. category должен быть одним из: " +
            categoryList.join(", ")
        },
        { role: "user", content: inputText }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return fallback;
    }

    const parsed = normalizeParsedResult(JSON.parse(content));
    return { ...parsed, source: "openai" };
  } catch (error) {
    console.error("[OpenAI] Fallback to keyword matching:", error);
    return fallback;
  }
}

function normalizeParsedResult(raw: unknown): ParsedResult {
  const value = (raw ?? {}) as Record<string, unknown>;
  const fallbackCategory = "consultation" as Category;
  const category = categoryList.includes(value.category as Category) ? (value.category as Category) : fallbackCategory;
  const service =
    typeof value.service === "string" && value.service.trim().length > 0
      ? value.service.trim()
      : services[category].name;
  const quantityCandidate = Number(value.quantity);
  const quantity = Number.isFinite(quantityCandidate) && quantityCandidate > 0 ? Math.round(quantityCandidate) : 1;
  const needsClarification = typeof value.needsClarification === "boolean" ? value.needsClarification : true;

  return { category, service, quantity, needsClarification };
}

function fallbackAnalyze(inputText: string): AnalyzeTaskResult {
  const category = detectCategoryByKeywords(inputText);
  return {
    category,
    service: services[category].name,
    quantity: 1,
    needsClarification: true,
    source: "mock"
  };
}
