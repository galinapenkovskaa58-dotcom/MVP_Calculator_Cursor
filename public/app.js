const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const taskInput = document.getElementById("task-input");
const resultCards = document.getElementById("result-cards");
const historyList = document.getElementById("history-list");
const newCalcBtn = document.getElementById("new-calc-btn");

const state = {
  stage: "task",
  taskText: "",
  analysis: null,
  hasDetails: null,
  detailsText: "",
  answers: {
    quantity: 1,
    urgency: "medium",
    complexity: "normal",
    revisions: "limited",
    turnkey: false
  },
  history: []
};

function addMessage(text, role = "bot") {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function renderChoiceButtons() {
  const wrap = document.createElement("div");
  wrap.className = "msg bot";
  wrap.innerHTML = `
    <div style="margin-bottom:10px;">Есть ли у вас подробности по задаче?</div>
    <div class="muted" style="font-size:13px; margin-bottom:10px;">
      Например: описание от клиента, документ, переписка, голосовое или любые материалы, которые помогут точнее рассчитать стоимость.
    </div>
    <button class="btn btn-primary" data-answer="yes" style="margin-right:8px;">Да, есть</button>
    <button class="btn" data-answer="no">Нет, только общий запрос</button>
  `;

  wrap.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.hasDetails = btn.dataset.answer === "yes";
      addMessage(btn.textContent || "", "user");
      wrap.remove();
      if (state.hasDetails) {
        state.stage = "details";
        addMessage("Вставьте подробности текстом. После этого я рассчитаю стоимость.");
      } else {
        state.stage = "clarify";
        addMessage(
          "Ответьте в формате: объем (число), срочность (low/medium/high), сложность (simple/normal/complex), правки (none/limited/many), под ключ (yes/no)."
        );
      }
    });
  });

  chatBox.appendChild(wrap);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function renderResults(payload) {
  resultCards.innerHTML = `
    <div class="result-card">
      <div class="muted">Категория</div>
      <div>${payload.category}</div>
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
      <div class="muted">Коэффициенты</div>
      <div>Urgency: ${payload.coefficients.urgency}</div>
      <div>Complexity: ${payload.coefficients.complexity}</div>
      <div>Revisions: ${payload.coefficients.revisions}</div>
      <div>Turnkey: ${payload.coefficients.turnkey}</div>
      <div>Quantity: ${payload.coefficients.quantity}</div>
    </div>
    <div class="result-card">
      <div class="muted">Рынок</div>
      <div>${payload.marketRange[0]}–${payload.marketRange[1]} ₽</div>
    </div>
    <div class="result-card">
      <div class="muted">Итоговая стоимость</div>
      <div class="result-price">${payload.total.toLocaleString("ru-RU")} ₽</div>
      <div class="muted">Расчёт: часы × ставка × коэффициенты</div>
    </div>
  `;
}

function updateHistory(title) {
  state.history.unshift(title);
  state.history = state.history.slice(0, 8);
  historyList.innerHTML = state.history.map((item) => `<li>${item}</li>`).join("");
}

async function analyzeTask(text) {
  const response = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputText: text })
  });
  return response.json();
}

async function requestCalculation() {
  const response = await fetch("/api/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: state.analysis.category,
      ...state.answers
    })
  });
  const calc = await response.json();
  return { ...calc, service: state.analysis.service };
}

function parseClarificationInput(text) {
  const normalized = text.toLowerCase();
  const parts = normalized.split(",").map((s) => s.trim());
  if (parts.length < 5) {
    return null;
  }

  const quantity = Number(parts[0].replace(/\D/g, "")) || 1;
  const urgency = ["low", "medium", "high"].includes(parts[1]) ? parts[1] : "medium";
  const complexity = ["simple", "normal", "complex"].includes(parts[2]) ? parts[2] : "normal";
  const revisions = ["none", "limited", "many"].includes(parts[3]) ? parts[3] : "limited";
  const turnkey = parts[4].includes("yes");

  return { quantity, urgency, complexity, revisions, turnkey };
}

async function runFinalCalculation() {
  const result = await requestCalculation();
  addMessage(
    `Рассчитано: ${result.total.toLocaleString("ru-RU")} ₽. Диапазон рынка: ${result.marketRange[0]}–${result.marketRange[1]} ₽.`
  );
  renderResults(result);
  updateHistory(`${state.analysis.service} — ${result.total.toLocaleString("ru-RU")} ₽`);
  state.stage = "done";
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    return;
  }

  addMessage(text, "user");
  taskInput.value = "";

  if (state.stage === "task") {
    state.taskText = text;
    try {
      state.analysis = await analyzeTask(text);
      addMessage(
        `Определил категорию: ${state.analysis.category}. Услуга: ${state.analysis.service}. Источник: ${state.analysis.source}.`
      );
      renderChoiceButtons();
    } catch {
      addMessage("Продолжим с базовым сценарием. Подробности по задаче есть?");
      renderChoiceButtons();
    }
    return;
  }

  if (state.stage === "details") {
    state.detailsText = text;
    addMessage("Подробности получены. Применяю стандартные коэффициенты и считаю.");
    await runFinalCalculation();
    return;
  }

  if (state.stage === "clarify") {
    const parsed = parseClarificationInput(text);
    if (!parsed) {
      addMessage("Не смог распарсить. Пример: 3, high, complex, many, yes");
      return;
    }
    state.answers = parsed;
    await runFinalCalculation();
    return;
  }

  if (state.stage === "done") {
    addMessage("Нажмите «Новый расчёт», чтобы начать заново.");
  }
});

newCalcBtn.addEventListener("click", () => {
  state.stage = "task";
  state.taskText = "";
  state.analysis = null;
  state.hasDetails = null;
  state.detailsText = "";
  state.answers = {
    quantity: 1,
    urgency: "medium",
    complexity: "normal",
    revisions: "limited",
    turnkey: false
  };
  chatBox.innerHTML = "";
  resultCards.innerHTML = `<p class="muted">После расчёта здесь появится стоимость и пояснение.</p>`;
  addMessage("Опишите, какую услугу нужно оценить.");
});

addMessage("Опишите, какую услугу нужно оценить.");
