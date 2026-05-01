export type Category =
  | "copywriting"
  | "social_media"
  | "design"
  | "video_editing"
  | "analytics"
  | "chatbot_setup"
  | "landing_page"
  | "consultation";

export const mockRates: Record<Category, { hourly: number; range: [number, number] }> = {
  copywriting: { hourly: 800, range: [1500, 5000] },
  social_media: { hourly: 900, range: [2000, 7000] },
  design: { hourly: 1200, range: [3000, 12000] },
  video_editing: { hourly: 1500, range: [4000, 20000] },
  analytics: { hourly: 1300, range: [3000, 15000] },
  chatbot_setup: { hourly: 1800, range: [7000, 40000] },
  landing_page: { hourly: 1700, range: [10000, 50000] },
  consultation: { hourly: 2000, range: [2000, 10000] }
};

export const services: Record<Category, { name: string; baseHours: number }> = {
  copywriting: { name: "Тексты и копирайтинг", baseHours: 3 },
  social_media: { name: "SMM-задача", baseHours: 4 },
  design: { name: "Дизайн-работа", baseHours: 6 },
  video_editing: { name: "Монтаж видео", baseHours: 7 },
  analytics: { name: "Аналитика и исследования", baseHours: 5 },
  chatbot_setup: { name: "Настройка чат-бота", baseHours: 10 },
  landing_page: { name: "Создание лендинга", baseHours: 14 },
  consultation: { name: "Консультация", baseHours: 2 }
};
