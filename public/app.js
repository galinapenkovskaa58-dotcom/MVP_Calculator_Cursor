const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const taskInput = document.getElementById("task-input");
const fileInput = document.getElementById("file-input");
const attachBtn = document.getElementById("attach-btn");
const fileStatus = document.getElementById("file-status");
const resultCards = document.getElementById("result-cards");
const historyList = document.getElementById("history-list");
const newCalcBtn = document.getElementById("new-calc-btn");

const state = {
  stage: "ask_name",
  userName: "",
  userLevel: "",
  taskText: "",
  contextText: "",
  analysis: null,
  hasDetails: false,
  detailsText: "",
  questionStep: 0,
  questionAnswers: {},
  answers: {
    quantity: 1,
    urgency: "medium",
    complexity: "normal",
    revisions: "limited",
    turnkey: false
  },
  history: []
};

const categoryLabels = {
  copywriting: "Тексты",
  social_media: "SMM",
  design: "Дизайн",
  video_editing: "Видеомонтаж",
  analytics: "Аналитика",
  chatbot_setup: "Чат-боты",
  landing_page: "Сайты и лендинги",
  consultation: "Консультации"
};

function addMessage(text, role = "bot") {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBotDelay() {
  return 2000 + Math.floor(Math.random() * 1000);
}

function addStatusMessage(text) {
  const div = document.createElement("div");
  div.className = "msg bot";
  div.dataset.status = "true";
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

function removeStatusMessage(node) {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

async function runWithStatus(statusText, action) {
  const statusNode = addStatusMessage(statusText);
  try {
    return await action();
  } finally {
    removeStatusMessage(statusNode);
  }
}

async function addBotMessageWithDelay(text) {
  const typingNode = addStatusMessage("Печатает...");
  await sleep(randomBotDelay());
  removeStatusMessage(typingNode);
  addMessage(text);
}

function appendContext(text) {
  const value = String(text || "").trim();
  if (!value) {
    return;
  }
  state.contextText = [state.contextText, value].filter(Boolean).join("\n");
}

function setFileStatus() {
  if (!fileStatus) {
    return;
  }
  const count = fileInput?.files?.length || 0;
  fileStatus.textContent = count > 0 ? `Прикреплено файлов: ${count}` : "";
}

function resetState() {
  state.stage = "ask_name";
  state.userName = "";
  state.userLevel = "";
  state.taskText = "";
  state.contextText = "";
  state.analysis = null;
  state.hasDetails = false;
  state.detailsText = "";
  state.questionStep = 0;
  state.questionAnswers = {};
  state.answers = {
    quantity: 1,
    urgency: "medium",
    complexity: "normal",
    revisions: "limited",
    turnkey: false
  };
}

const baseQuestions = [
  {
    key: "deadline",
    question: "Какой дедлайн по задаче?",
    hint: "Например: сегодня, 2 дня, до конца недели."
  },
  {
    key: "revisions",
    question: "Сколько раундов правок планируется?",
    hint: "Например: без правок, 1-2, 3+."
  },
  {
    key: "turnkey",
    question: "Нужен результат под ключ или только часть работы?",
    hint: "Напишите: под ключ / частично."
  }
];

const categoryQuestions = {
  video_editing: [
    {
      key: "video_duration",
      question: "Какая длительность итогового видео и сколько роликов нужно?",
      hint: "Например: 3 reels по 30 секунд."
    },
    {
      key: "video_materials",
      question: "Какие материалы уже есть: видео, фото, исходники, сценарий?",
      hint: "Если ничего нет — тоже напишите."
    },
    {
      key: "video_references",
      question: "Есть ли референсы по стилю, темпу и подаче?",
      hint: "Можно описать или прикрепить примеры."
    },
    {
      key: "video_extras",
      question: "Нужны ли субтитры, музыка, озвучка, анимация, цветокоррекция?",
      hint: "Уточните, какие элементы обязательны."
    }
  ],
  design: [
    { key: "design_scope", question: "Что именно нужно сделать по дизайну?", hint: "Баннеры, презентация, фирстиль, макеты и т.д." },
    { key: "design_refs", question: "Есть ли брендбук, референсы и ограничения по стилю?", hint: "Уточните, что обязательно учесть." }
  ],
  landing_page: [
    { key: "site_scope", question: "Что должно быть на лендинге: блоки, формы, интеграции?", hint: "Опишите структуру страницы." },
    { key: "site_materials", question: "Есть ли тексты, фото и прототип, или всё нужно подготовить с нуля?", hint: "Это влияет на итоговый объём работ." }
  ],
  copywriting: [
    { key: "text_format", question: "Какой формат текста нужен?", hint: "Пост, статья, серия писем, лендинг и т.д." },
    { key: "text_volume", question: "Какой ориентир по объёму?", hint: "Например: 1 пост, 5 постов, 5 000 знаков." }
  ],
  social_media: [
    { key: "smm_scope", question: "Какие задачи входят в SMM?", hint: "Контент-план, постинг, визуал, аналитика, реклама." },
    { key: "smm_period", question: "На какой период нужен результат?", hint: "Например: неделя, месяц, квартал." }
  ],
  analytics: [
    { key: "analytics_type", question: "Какой именно анализ нужен?", hint: "ЦА, конкуренты, воронка, аудит контента." },
    { key: "analytics_depth", question: "Нужен краткий вывод или глубокий отчёт с рекомендациями?", hint: "Это влияет на сложность." }
  ],
  chatbot_setup: [
    { key: "bot_platform", question: "На какой платформе нужен бот?", hint: "Telegram, WhatsApp, Instagram и т.д." },
    { key: "bot_logic", question: "Какая логика бота: ответы, воронка, интеграции, CRM?", hint: "Опишите сценарий использования." }
  ],
  consultation: [
    { key: "consult_topic", question: "Какая тема консультации и желаемый результат?", hint: "Что вы хотите получить после созвона?" },
    { key: "consult_duration", question: "Сколько длится сессия и нужна ли подготовка материалов?", hint: "Например: 60 минут + разбор кейса." }
  ]
};

function getActiveQuestions() {
  const byCategory = categoryQuestions[state.analysis?.category] || [];
  return [...byCategory, ...baseQuestions];
}

async function runQuestionFlow() {
  const questions = getActiveQuestions();
  while (state.questionStep < questions.length) {
    const current = questions[state.questionStep];
    if (!state.questionAnswers[current.key]) {
      break;
    }
    state.questionStep += 1;
  }

  const step = questions[state.questionStep];
  if (!step) {
    applyQuestionHeuristics();
    await runWithStatus("Считаю итоговую стоимость...", async () => {
      await runFinalCalculation();
    });
    return;
  }
  await addBotMessageWithDelay(`${step.question}\n${step.hint}`);
}

function hydrateAnswersFromContext() {
  const context = `${state.taskText}\n${state.detailsText}\n${state.contextText}`.toLowerCase();
  if (!context.trim()) {
    return;
  }

  const remember = (key, value) => {
    if (!state.questionAnswers[key] && value) {
      state.questionAnswers[key] = value;
    }
  };

  const rollCount = context.match(/(\d+)\s*(ролик|reels|видео|шортс|shorts)/);
  if (rollCount) {
    remember("video_duration", `${rollCount[1]} ролик(а/ов)`);
  }

  if (context.includes("сек") || context.includes("мин")) {
    const duration = context.match(/(\d+)\s*(сек|секунд|мин|минут)/);
    if (duration) {
      remember("video_duration", `${duration[1]} ${duration[2]}`);
    }
  }

  if (context.includes("референс") || context.includes("пример") || context.includes("образец")) {
    remember("video_references", "Референсы есть");
  }

  if (context.includes("фото") || context.includes("исходник") || context.includes("сценар")) {
    remember("video_materials", "Часть материалов уже есть");
  }

  if (context.includes("субтитр") || context.includes("музык") || context.includes("озвучк") || context.includes("анимац")) {
    remember("video_extras", "Нужны дополнительные элементы монтажа");
  }

  if (context.includes("сегодня") || context.includes("завтра") || context.includes("дедлайн")) {
    remember("deadline", "Срочный дедлайн");
  }

  if (context.includes("без правок")) {
    remember("revisions", "Без правок");
  } else if (context.includes("правк")) {
    remember("revisions", "Правки предусмотрены");
  }

  if (context.includes("под ключ")) {
    remember("turnkey", "Под ключ");
  } else if (context.includes("част")) {
    remember("turnkey", "Частично");
  }
}

function renderResults(payload) {
  const categoryLabel = categoryLabels[payload.category] || "Консультации";
  const sourceLabel = payload.rateSource === "hh" ? "hh.ru" : "локальные данные";
  const noviceNote = payload.noviceCapped
    ? `<div class="muted">Для уровня "новичок" итог ограничен верхней границей рынка.</div>`
    : "";
  const lineItems = (payload.lineItems || [])
    .map((item) => `<div>${item.title}: <b>${Number(item.amount).toLocaleString("ru-RU")} ₽</b></div>`)
    .join("");
  const clientExplanation = buildClientExplanation(payload).replace(/\n/g, "<br>");
  resultCards.innerHTML = `
    <div class="result-card">
      <div class="muted">Категория</div>
      <div>${categoryLabel}</div>
    </div>
    <div class="result-card">
      <div class="muted">Услуга</div>
      <div>${payload.serviceName}</div>
    </div>
    <div class="result-card">
      <div class="muted">Базовая ставка</div>
      <div>${payload.hourlyRate} ₽/час (${payload.rateSource})</div>
    </div>
    <div class="result-card">
      <div class="muted">Состав работ и стоимость</div>
      ${lineItems || "<div>Состав работ формируется после уточнений.</div>"}
    </div>
    <div class="result-card">
      <div class="muted">Рынок</div>
      <div>${payload.marketRange[0]}–${payload.marketRange[1]} ₽</div>
      <div class="muted">Источник: ${sourceLabel}</div>
    </div>
    <div class="result-card">
      <div class="muted">Итоговая стоимость</div>
      <div class="result-price">${payload.total.toLocaleString("ru-RU")} ₽</div>
      <div class="muted">Расчёт: часы × ставка × коэффициенты</div>
      ${noviceNote}
    </div>
    <div class="result-card">
      <div class="muted">Пояснение для клиента</div>
      <div>${clientExplanation}</div>
    </div>
  `;
}

function buildClientExplanation(result) {
  const levelText = state.userLevel || "есть опыт";
  const sourceText = result.rateSource === "hh" ? "данные hh.ru" : "локальные рыночные ориентиры";
  const works = (result.lineItems || [])
    .map((item) => `- ${item.title}: ${Number(item.amount).toLocaleString("ru-RU")} ₽`)
    .join("\n");
  const lines = [
    `1) Базовая услуга: ${result.serviceName}.`,
    `2) Базовая ставка: ${result.hourlyRate} ₽/час (${sourceText}).`,
    `3) В стоимость входит:\n${works || "- Основные этапы работ."}`,
    `4) Уровень исполнителя: ${levelText}.`,
    `5) Итог: ${result.total.toLocaleString("ru-RU")} ₽, рыночный диапазон ${result.marketRange[0]}–${result.marketRange[1]} ₽.`
  ];
  return lines.join("\n");
}

function updateHistory(title) {
  state.history.unshift(title);
  state.history = state.history.slice(0, 8);
  historyList.innerHTML = state.history.map((item) => `<li>${item}</li>`).join("");
}

async function extractFilesIfPresent() {
  const files = fileInput?.files;
  if (!files || files.length === 0) {
    return "";
  }

  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));

  try {
    const response = await fetch("/api/files/extract", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    const text = String(data?.combinedText || "").trim();
    fileInput.value = "";
    setFileStatus();

    if (!text) {
      addMessage("Файлы получил, но текст извлечь не удалось. Продолжаю по вашему описанию.");
      return "";
    }

    addMessage("Файлы изучил и учёл в анализе.");
    appendContext(text);
    return text;
  } catch {
    fileInput.value = "";
    setFileStatus();
    addMessage("Не удалось обработать файлы, продолжаю по тексту.");
    return "";
  }
}

async function analyzeTask(inputText, filesText = "") {
  const response = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputText, contextText: filesText })
  });
  return response.json();
}

async function requestCalculation() {
  const levelMap = {
    новичок: "novice",
    "есть опыт": "experienced",
    специалист: "specialist"
  };
  const response = await fetch("/api/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: state.analysis.category,
      userLevel: levelMap[state.userLevel] || "experienced",
      ...state.answers
    })
  });
  const calc = await response.json();
  return { ...calc, service: state.analysis.service };
}

function applyQuestionHeuristics() {
  const allAnswers = Object.values(state.questionAnswers)
    .join(" ")
    .toLowerCase();

  const quantitySource = String(state.questionAnswers.video_duration || state.questionAnswers.text_volume || "").toLowerCase();
  const qtyMatch = quantitySource.match(/(\d+)\s*(ролик|reels|видео|пост|шт)/);
  if (qtyMatch?.[1]) {
    state.answers.quantity = Math.max(1, Math.min(8, Number(qtyMatch[1]) || 1));
  } else {
    const genericNumbers = quantitySource.match(/\d+/g) || [];
    const safeValue = Number(genericNumbers[0] || 1);
    state.answers.quantity = Math.max(1, Math.min(5, safeValue));
  }

  if (allAnswers.includes("сегодня") || allAnswers.includes("срочно") || allAnswers.includes("24")) {
    state.answers.urgency = "high";
  } else if (allAnswers.includes("недел")) {
    state.answers.urgency = "medium";
  } else if (allAnswers.includes("месяц") || allAnswers.includes("не срочно")) {
    state.answers.urgency = "low";
  }

  if (allAnswers.includes("слож") || allAnswers.includes("интеграц") || allAnswers.includes("с нуля")) {
    state.answers.complexity = "complex";
  } else if (allAnswers.includes("просто") || allAnswers.includes("базов")) {
    state.answers.complexity = "simple";
  } else {
    state.answers.complexity = "normal";
  }

  if (allAnswers.includes("без правок")) {
    state.answers.revisions = "none";
  } else if (allAnswers.includes("3") || allAnswers.includes("много") || allAnswers.includes("несколько")) {
    state.answers.revisions = "many";
  } else {
    state.answers.revisions = "limited";
  }

  state.answers.turnkey = allAnswers.includes("под ключ") || allAnswers.includes("с нуля");

  if (state.userLevel === "новичок") {
    state.answers.complexity = state.answers.complexity === "simple" ? "normal" : state.answers.complexity;
  }
}

async function runFinalCalculation() {
  const result = await requestCalculation();
  await addBotMessageWithDelay(
    `${state.userName}, рассчитано: ${result.total.toLocaleString("ru-RU")} ₽. Диапазон рынка: ${result.marketRange[0]}–${result.marketRange[1]} ₽.`
  );
  await addBotMessageWithDelay(buildClientExplanation(result));
  renderResults(result);
  updateHistory(`${state.analysis.service} — ${result.total.toLocaleString("ru-RU")} ₽`);
  state.stage = "done";
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  const hasFiles = Boolean(fileInput?.files?.length);
  if (!text && !hasFiles) {
    return;
  }

  if (text) {
    addMessage(text, "user");
  } else {
    addMessage("Прикрепил файл(ы)", "user");
  }
  taskInput.value = "";

  if (state.stage === "ask_name") {
    state.userName = text || "Коллега";
    state.stage = "task";
    await addBotMessageWithDelay(`Приятно познакомиться, ${state.userName}. Опишите, какую услугу нужно оценить.`);
    return;
  }

  if (state.stage === "task") {
    state.taskText = text || "Задача из прикрепленного документа";
    appendContext(state.taskText);
    try {
      const filesText = await runWithStatus("Анализирую материалы...", async () => extractFilesIfPresent());
      state.analysis = await runWithStatus("Подбираю параметры задачи...", async () =>
        analyzeTask(state.taskText, filesText)
      );
      state.answers.quantity = state.analysis.quantity || 1;
      state.stage = "ask_level";
      await addBotMessageWithDelay("Уточните ваш уровень в этой сфере: новичок, есть опыт или специалист?");
    } catch {
      await addBotMessageWithDelay("Продолжим с базовым сценарием. Подробности по задаче есть?");
      state.stage = "ask_level";
    }
    return;
  }

  if (state.stage === "ask_level") {
    const normalized = text.toLowerCase();
    if (normalized.includes("нов")) state.userLevel = "новичок";
    else if (normalized.includes("спец")) state.userLevel = "специалист";
    else state.userLevel = "есть опыт";

    state.stage = "ask_details";
    await addBotMessageWithDelay("Есть ли подробности по задаче? Можно прислать текст, файл или и то и другое.");
    return;
  }

  if (state.stage === "ask_details") {
    const normalized = text.toLowerCase();
    state.hasDetails = normalized.includes("да") || normalized.includes("есть") || hasFiles;
    if (state.hasDetails) {
      state.stage = "details";
      await addBotMessageWithDelay("Отлично, отправьте подробности. Я изучу материалы и перейду к точным вопросам.");
    } else {
      state.stage = "questions";
      state.questionStep = 0;
      hydrateAnswersFromContext();
      await addBotMessageWithDelay("Хорошо, тогда уточню ключевые параметры по задаче.");
      await runQuestionFlow();
    }
    return;
  }

  if (state.stage === "details") {
    state.detailsText = text || "Подробности в прикрепленном документе";
    appendContext(state.detailsText);
    const filesText = await runWithStatus("Изучаю подробности...", async () => extractFilesIfPresent());
    try {
      const detailsAnalysis = await runWithStatus("Уточняю оценку по материалам...", async () =>
        analyzeTask(`${state.taskText}\n\n${state.detailsText}`, filesText)
      );
      if (detailsAnalysis?.category) {
        state.analysis = detailsAnalysis;
      }
      if (detailsAnalysis?.quantity) {
        state.answers.quantity = detailsAnalysis.quantity;
      }
    } catch {
      // Keep previous analysis if enhanced analysis fails.
    }
    state.stage = "questions";
    state.questionStep = 0;
    hydrateAnswersFromContext();
    await addBotMessageWithDelay("Подробности получил. Задам несколько точных вопросов, чтобы не промахнуться с оценкой.");
    await runQuestionFlow();
    return;
  }

  if (state.stage === "questions") {
    const questions = getActiveQuestions();
    const step = questions[state.questionStep];
    if (!step) {
      applyQuestionHeuristics();
      await runWithStatus("Считаю итоговую стоимость...", async () => {
        await runFinalCalculation();
      });
      return;
    }

    if (!text) {
      await addBotMessageWithDelay("Ответ не получил. Напишите коротко в свободной форме, как вам удобно.");
      return;
    }

    state.questionAnswers[step.key] = text;
    appendContext(text);
    state.questionStep += 1;
    await runQuestionFlow();
    return;
  }

  if (state.stage === "done") {
    await addBotMessageWithDelay("Нажмите «Новый расчёт», чтобы начать заново.");
  }
});

newCalcBtn.addEventListener("click", () => {
  resetState();
  chatBox.innerHTML = "";
  resultCards.innerHTML = `<p class="muted">После расчёта здесь появится стоимость и пояснение.</p>`;
  if (fileInput) {
    fileInput.value = "";
    setFileStatus();
  }
  addMessage("Как вас зовут?");
});

attachBtn?.addEventListener("click", () => fileInput?.click());
fileInput?.addEventListener("change", setFileStatus);
taskInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  if (event.ctrlKey) {
    event.preventDefault();
    const start = taskInput.selectionStart ?? taskInput.value.length;
    const end = taskInput.selectionEnd ?? taskInput.value.length;
    const before = taskInput.value.slice(0, start);
    const after = taskInput.value.slice(end);
    taskInput.value = `${before}\n${after}`;
    taskInput.selectionStart = taskInput.selectionEnd = start + 1;
    return;
  }

  event.preventDefault();
  chatForm.requestSubmit();
});

addMessage("Как вас зовут?");
