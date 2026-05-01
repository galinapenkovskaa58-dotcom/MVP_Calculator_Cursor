import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import multer from "multer";
import { analyzeTask } from "./src/lib/aiProvider.js";
import { calculatePrice } from "./src/lib/calculation.js";
import { getRatesForCategory } from "./src/lib/hhProvider.js";
import { type Category } from "./src/data/pricing.js";
import { extractTextFromFile, isSupportedFile } from "./src/lib/fileReader.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticPath = path.join(__dirname, "public");
const categories: Category[] = [
  "copywriting",
  "social_media",
  "design",
  "video_editing",
  "analytics",
  "chatbot_setup",
  "landing_page",
  "consultation"
];

const noviceBands: Record<Category, [number, number]> = {
  copywriting: [2000, 6000],
  social_media: [3500, 9000],
  design: [4000, 12000],
  video_editing: [4000, 8000],
  analytics: [3000, 9000],
  chatbot_setup: [5000, 15000],
  landing_page: [7000, 20000],
  consultation: [2000, 6000]
};

const workTemplates: Record<Category, Array<{ title: string; share: number }>> = {
  video_editing: [
    { title: "Подготовка структуры и сценарного каркаса", share: 0.2 },
    { title: "Подбор/подготовка материалов (фото, видео, графика)", share: 0.2 },
    { title: "Монтаж и сборка ролика", share: 0.35 },
    { title: "Субтитры, музыка, эффекты, цветокоррекция", share: 0.15 },
    { title: "Финальная сборка и экспорт", share: 0.1 }
  ],
  copywriting: [
    { title: "Сбор вводных и структура текста", share: 0.25 },
    { title: "Написание основного текста", share: 0.45 },
    { title: "Редактура и вычитка", share: 0.2 },
    { title: "Правки и финальная версия", share: 0.1 }
  ],
  social_media: [
    { title: "Анализ ниши и аудитории", share: 0.2 },
    { title: "Контент-структура и идеи", share: 0.3 },
    { title: "Создание контента", share: 0.35 },
    { title: "Правки и финализация", share: 0.15 }
  ],
  design: [
    { title: "Сбор требований и референсов", share: 0.2 },
    { title: "Черновые варианты", share: 0.35 },
    { title: "Доработка выбранного решения", share: 0.3 },
    { title: "Подготовка финальных файлов", share: 0.15 }
  ],
  analytics: [
    { title: "Сбор и структурирование данных", share: 0.3 },
    { title: "Анализ и интерпретация", share: 0.4 },
    { title: "Выводы и рекомендации", share: 0.3 }
  ],
  chatbot_setup: [
    { title: "Проектирование логики бота", share: 0.25 },
    { title: "Настройка сценариев и веток", share: 0.4 },
    { title: "Интеграции и тестирование", share: 0.25 },
    { title: "Финальная настройка", share: 0.1 }
  ],
  landing_page: [
    { title: "Структура и прототип", share: 0.2 },
    { title: "Дизайн и визуальная часть", share: 0.3 },
    { title: "Верстка и сборка страницы", share: 0.35 },
    { title: "Тестирование и финализация", share: 0.15 }
  ],
  consultation: [
    { title: "Подготовка и анализ запроса", share: 0.3 },
    { title: "Консультационная сессия", share: 0.5 },
    { title: "Рекомендации после сессии", share: 0.2 }
  ]
};

app.post("/api/ai/analyze", async (req, res) => {
  try {
    const inputText = String(req.body?.inputText ?? "").trim();
    const contextText = String(req.body?.contextText ?? "").trim();
    const fullInput = [inputText, contextText].filter(Boolean).join("\n\n");

    if (!fullInput) {
      return res.json({
        category: "consultation",
        service: "Консультация",
        quantity: 1,
        needsClarification: true,
        source: "mock"
      });
    }

    const result = await analyzeTask(fullInput);
    return res.json(result);
  } catch (error) {
    console.error("[API] /api/ai/analyze error:", error);
    return res.json({
      category: "consultation",
      service: "Консультация",
      quantity: 1,
      needsClarification: true,
      source: "mock"
    });
  }
});

app.post("/api/files/extract", upload.array("files"), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      return res.json({ files: [], combinedText: "" });
    }

    const filteredFiles = files.filter((file) => isSupportedFile(file.originalname));
    const extracted = await Promise.all(filteredFiles.map((file) => extractTextFromFile(file)));
    const normalized = extracted.map((item) => ({
      ...item,
      text: item.text || ""
    }));

    const combinedText = normalized
      .filter((item) => item.text.trim().length > 0)
      .map((item) => `[${item.name}]\n${item.text}`)
      .join("\n\n");

    return res.json({
      files: normalized,
      combinedText
    });
  } catch (error) {
    console.error("[API] /api/files/extract error:", error);
    return res.json({ files: [], combinedText: "" });
  }
});

app.post("/api/calculate", async (req, res) => {
  try {
    const {
      category,
      quantity = 1,
      urgency = "medium",
      complexity = "normal",
      revisions = "limited",
      turnkey = false,
      userLevel = "experienced"
    } = req.body ?? {};

    const requestedCategory = String(category || "consultation");
    const safeCategory = categories.includes(requestedCategory as Category)
      ? (requestedCategory as Category)
      : "consultation";
    const rateData = await getRatesForCategory(safeCategory);

    const result = calculatePrice({
      category: safeCategory,
      quantity: Number(quantity) || 1,
      urgency,
      complexity,
      revisions,
      turnkey: Boolean(turnkey),
      userLevel,
      hourlyRate: rateData.hourly
    });

    const marketRange =
      rateData.rangeType === "hourly"
        ? ([Math.round(rateData.range[0] * result.effectiveHours), Math.round(rateData.range[1] * result.effectiveHours)] as [
            number,
            number
          ])
        : rateData.range;

    const adjustedTotal = adjustTotalByLevel(safeCategory, userLevel, result.total);
    const noviceCapped = userLevel === "novice" && adjustedTotal !== result.total;
    const lineItems = buildLineItems(safeCategory, adjustedTotal);

    return res.json({
      ...result,
      total: adjustedTotal,
      category: safeCategory,
      hourlyRate: rateData.hourly,
      marketRange,
      rateSource: rateData.source,
      noviceCapped,
      lineItems
    });
  } catch (error) {
    console.error("[API] /api/calculate error:", error);
    return res.status(200).json({
      error: false,
      message: "calculation fallback",
      total: 0
    });
  }
});

function adjustTotalByLevel(category: Category, userLevel: string, total: number): number {
  if (userLevel !== "novice") {
    return total;
  }
  const [minTotal, maxTotal] = noviceBands[category];
  const lowered = Math.round(total * 0.45);
  const bounded = Math.max(minTotal, Math.min(maxTotal, lowered));
  return roundToHundreds(bounded);
}

function buildLineItems(category: Category, total: number): Array<{ title: string; amount: number }> {
  const template = workTemplates[category];
  let sum = 0;
  const items = template.map((part, index) => {
    const isLast = index === template.length - 1;
    const amount = isLast ? total - sum : roundToHundreds(total * part.share);
    sum += amount;
    return { title: part.title, amount: Math.max(0, amount) };
  });
  return items;
}

function roundToHundreds(value: number): number {
  return Math.round(value / 100) * 100;
}

app.use(express.static(staticPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`MVP Calculator started on http://localhost:${port}`);
});
