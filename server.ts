import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { analyzeTask } from "./src/lib/aiProvider.js";
import { calculatePrice } from "./src/lib/calculation.js";
import { getRatesForCategory } from "./src/lib/hhProvider.js";
import { type Category } from "./src/data/pricing.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

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

app.post("/api/ai/analyze", async (req, res) => {
  try {
    const inputText = String(req.body?.inputText ?? "").trim();
    if (!inputText) {
      return res.json({
        category: "consultation",
        service: "Консультация",
        quantity: 1,
        needsClarification: true,
        source: "mock"
      });
    }

    const result = await analyzeTask(inputText);
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

app.post("/api/calculate", async (req, res) => {
  try {
    const {
      category,
      quantity = 1,
      urgency = "medium",
      complexity = "normal",
      revisions = "limited",
      turnkey = false
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
      hourlyRate: rateData.hourly
    });

    return res.json({
      ...result,
      category: safeCategory,
      hourlyRate: rateData.hourly,
      marketRange: rateData.range,
      rateSource: rateData.source
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

app.use(express.static(staticPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`MVP Calculator started on http://localhost:${port}`);
});
