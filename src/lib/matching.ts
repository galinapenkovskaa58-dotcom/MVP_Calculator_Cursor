import type { Category } from "../data/pricing.js";

type KeywordMap = Record<Category, string[]>;

const keywordMap: KeywordMap = {
  copywriting: ["текст", "пост", "статья", "копирайт", "email", "лента"],
  social_media: ["smm", "соцсети", "контент-план", "инстаграм", "telegram", "reels-план"],
  design: ["дизайн", "баннер", "презентац", "фирменный стиль", "макет", "figma"],
  video_editing: ["видео", "reels", "монтаж", "ролик", "шортс", "подкаст"],
  analytics: ["анализ", "аудит", "целевая аудитория", "исследование", "метрики", "воронка"],
  chatbot_setup: ["чат-бот", "бот", "автоворонка", "telegram bot", "manychat", "сценарий бота"],
  landing_page: ["лендинг", "сайт", "tilda", "webflow", "посадочная", "landing"],
  consultation: ["консультация", "созвон", "разбор", "менторство", "сессия"]
};

export function detectCategoryByKeywords(inputText: string): Category {
  const normalized = inputText.toLowerCase();

  const scored = Object.entries(keywordMap).map(([category, words]) => {
    const score = words.reduce((acc, word) => (normalized.includes(word) ? acc + 1 : acc), 0);
    return { category: category as Category, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].score > 0 ? scored[0].category : "consultation";
}
