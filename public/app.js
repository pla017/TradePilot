const dom = {
  groupSelect: document.querySelector("#groupSelect"),
  currentGroupName: document.querySelector("#currentGroupName"),
  currentGroupHint: document.querySelector("#currentGroupHint"),
  miniCollection: document.querySelector("#miniCollection"),
  miniLc: document.querySelector("#miniLc"),
  miniMixed: document.querySelector("#miniMixed"),
  studentSelect: document.querySelector("#studentSelect"),
  reflectionStudentName: document.querySelector("#reflectionStudentName"),
  stageOneGrid: document.querySelector("#stageOneGrid"),
  stageOneStatus: document.querySelector("#stageOneStatus"),
  railStageOne: document.querySelector("#railStageOne"),
  railStageTwo: document.querySelector("#railStageTwo"),
  railReflection: document.querySelector("#railReflection"),
  nextGate: document.querySelector("#nextGate"),
  nextStageBtn: document.querySelector("#nextStageBtn"),
  stageTwo: document.querySelector("#stageTwo"),
  stageTwoStatus: document.querySelector("#stageTwoStatus"),
  mixedForm: document.querySelector("#mixedForm"),
  mixedContent: document.querySelector("#mixedContent"),
  mixedFeedback: document.querySelector("#mixedFeedback"),
  riskScore: document.querySelector("#riskScore"),
  riskLevelText: document.querySelector("#riskLevelText"),
  customerCase: document.querySelector("#customerCase"),
  reflectionForm: document.querySelector("#reflectionForm"),
  reflectionContent: document.querySelector("#reflectionContent"),
  selfEvaluationForm: document.querySelector("#selfEvaluationForm"),
  selfScore: document.querySelector("#selfScore"),
  selfEvaluationContent: document.querySelector("#selfEvaluationContent"),
  peerEvaluationForm: document.querySelector("#peerEvaluationForm"),
  peerTargetGroup: document.querySelector("#peerTargetGroup"),
  peerScore: document.querySelector("#peerScore"),
  peerEvaluationContent: document.querySelector("#peerEvaluationContent"),
  aiQuestion: document.querySelector("#aiQuestion"),
  askAiBtn: document.querySelector("#askAiBtn"),
  voiceInputBtn: document.querySelector("#voiceInputBtn"),
  assistantReply: document.querySelector("#assistantReply p"),
  speakReplyBtn: document.querySelector("#speakReplyBtn"),
  toast: document.querySelector("#toast")
};

let state = null;
let selectedGroupId = localStorage.getItem("tradepilot.groupId") || "g1";
let currentReply = dom.assistantReply.textContent;
let cachedVoices = [];

init();

async function init() {
  bindEvents();
  initSpeechVoices();
  await loadState();
  renderAll();
}

function bindEvents() {
  dom.groupSelect.addEventListener("change", () => {
    selectedGroupId = dom.groupSelect.value;
    localStorage.setItem("tradepilot.groupId", selectedGroupId);
    renderAll();
  });
  dom.studentSelect.addEventListener("change", renderReflectionStudentName);

  dom.stageOneGrid.addEventListener("submit", handleScenarioSubmit);

  dom.nextStageBtn.addEventListener("click", () => {
    localStorage.setItem(stageTwoKey(), "open");
    renderStageTwo();
    dom.stageTwo.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  dom.mixedForm.addEventListener("submit", handleMixedSubmit);

  document.querySelectorAll(".risk-select").forEach((select) => {
    select.addEventListener("change", updateRiskResult);
  });

  dom.customerCase.addEventListener("change", applyCustomerPreset);
  dom.selfEvaluationForm.addEventListener("submit", handleSelfEvaluationSubmit);
  dom.peerEvaluationForm.addEventListener("submit", handlePeerEvaluationSubmit);
  dom.reflectionForm.addEventListener("submit", handleReflectionSubmit);
  document.querySelectorAll(".prompt-chips button").forEach((button) => {
    button.addEventListener("click", () => {
      dom.aiQuestion.value = button.dataset.question || "";
      dom.aiQuestion.focus();
    });
  });
  dom.askAiBtn.addEventListener("click", askAi);
  dom.aiQuestion.addEventListener("keydown", (event) => {
    if (event.key === "Enter") askAi();
  });
  dom.voiceInputBtn.addEventListener("click", startVoiceInput);
  dom.speakReplyBtn.addEventListener("click", () => speak(currentReply));
}

async function loadState() {
  state = await api("/api/bootstrap");
  if (!state.groups.some((group) => group.id === selectedGroupId)) {
    selectedGroupId = state.groups[0]?.id || "g1";
  }
}

function renderAll() {
  renderGroupSelect();
  renderGroupContext();
  renderStudentSelect();
  renderReflectionStudentName();
  renderPeerTargetGroups();
  renderStageOne();
  renderStageTwo();
  dom.railReflection.classList.toggle(
    "done",
    state.reflections.some((item) => item.groupId === selectedGroupId)
  );
  updateRiskResult();
}

function renderGroupSelect() {
  dom.groupSelect.innerHTML = state.groups
    .map((group) => `<option value="${group.id}" ${group.id === selectedGroupId ? "selected" : ""}>${escapeHtml(group.name)}</option>`)
    .join("");
}

function renderGroupContext() {
  const group = state.groups.find((item) => item.id === selectedGroupId);
  const groupName = currentGroupName();
  dom.currentGroupName.textContent = groupName;
  dom.currentGroupHint.textContent = `${groupName} 的托收、信用证、混合支付方案会同步到教师看板。`;

  setMiniStatus(dom.miniCollection, "托收", Boolean(getSubmission("collection_crisis")));
  setMiniStatus(dom.miniLc, "信用证", Boolean(getSubmission("lc_crisis")));
  setMiniStatus(dom.miniMixed, "混合支付", Boolean(getSubmission("mixed_payment")));
}

function currentGroupName() {
  return state.groups.find((item) => item.id === selectedGroupId)?.name || "未知小组";
}

function setMiniStatus(element, label, done) {
  element.textContent = `${label}：${done ? "已交" : "待交"}`;
  element.classList.toggle("done", done);
}

function renderStudentSelect() {
  const students = state.students.filter((student) => student.groupId === selectedGroupId);
  dom.studentSelect.innerHTML = students
    .map((student) => `<option value="${student.id}">${escapeHtml(student.name)}</option>`)
    .join("");
}

function renderReflectionStudentName() {
  const student = state.students.find((item) => item.id === dom.studentSelect.value);
  dom.reflectionStudentName.textContent = student ? `${student.name}（${currentGroupName()}）` : "请先选择学生姓名";
}

function renderPeerTargetGroups() {
  const options = state.groups.filter((group) => group.id !== selectedGroupId);
  dom.peerTargetGroup.innerHTML = options
    .map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`)
    .join("");
}

function renderStageOne() {
  const scenarios = state.scenarios.filter((scenario) => scenario.phase === 1);
  const completed = scenarios.filter((scenario) => getSubmission(scenario.code)).length;
  dom.stageOneStatus.textContent = `已完成 ${completed}/${scenarios.length}`;
  dom.stageOneStatus.classList.toggle("done", completed === scenarios.length);
  dom.railStageOne.textContent = `第一阶段 ${completed}/${scenarios.length}`;
  dom.railStageOne.classList.toggle("done", completed === scenarios.length);

  dom.stageOneGrid.innerHTML = scenarios
    .map((scenario) => {
      const submission = getSubmission(scenario.code);
      const iconName = scenario.code === "collection_crisis" ? "hand" : "invoice";
      const labelIcon = scenario.code === "collection_crisis" ? "file" : "edit";
      const businessText = scenario.description.split("请")[0];
      const placeholder = scenario.code === "collection_crisis"
        ? "请输入您的托收危机应对策略..."
        : "请输入您的信用证危机应对策略...";
      return `
        <form class="scenario-card" data-code="${scenario.code}">
          <header class="card-heading">
            ${icon(iconName)}
            <h3>${escapeHtml(scenario.title)}</h3>
          </header>
          <div class="scenario-description">
            <p>${icon("alert")}<strong>业务情境：</strong>${escapeHtml(businessText)}</p>
            <p>${icon("bulb")}请你作为业务员，提出化解${escapeHtml(scenario.title)}的对策。</p>
          </div>
          <label class="field">
            <span>${icon(labelIcon)}${escapeHtml(scenario.title.replace("收汇", ""))}解决方案</span>
            <textarea name="content" rows="7" placeholder="${placeholder}">${escapeHtml(submission?.content || "")}</textarea>
          </label>
          <button class="primary-button wide" type="submit">${icon("chart")}AI顾问·多维点评</button>
          ${renderFeedback(submission, scenario.code)}
        </form>
      `;
    })
    .join("");

  const stageOneComplete = completed === scenarios.length;
  dom.nextGate.hidden = !stageOneComplete;
}

function renderStageTwo() {
  const mixed = getSubmission("mixed_payment");
  const open = localStorage.getItem(stageTwoKey()) === "open" || Boolean(mixed);
  dom.stageTwo.hidden = !open;
  dom.stageTwoStatus.textContent = mixed ? `已提交，评分 ${mixed.score}` : "未提交";
  dom.stageTwoStatus.classList.toggle("done", Boolean(mixed));
  dom.railStageTwo.textContent = mixed ? "第二阶段已完成" : open ? "第二阶段进行中" : "第二阶段待解锁";
  dom.railStageTwo.classList.toggle("active", open);
  dom.railStageTwo.classList.toggle("done", Boolean(mixed));
  dom.mixedContent.value = mixed?.content || "";

  if (mixed) {
    dom.mixedFeedback.hidden = false;
    dom.mixedFeedback.innerHTML = renderFeedbackContent(mixed);
  } else {
    dom.mixedFeedback.hidden = true;
  }
}

async function handleScenarioSubmit(event) {
  event.preventDefault();
  const form = event.target.closest("form");
  const button = form.querySelector("button");
  const scenarioCode = form.dataset.code;
  const content = form.querySelector("textarea").value.trim();
  if (!content) {
    showToast("请先填写小组方案。");
    return;
  }

  button.disabled = true;
  button.innerHTML = `${icon("chart")}提交中...`;
  try {
    const result = await api("/api/submissions", {
      method: "POST",
      body: { groupId: selectedGroupId, scenarioCode, content }
    });
    upsertSubmission(result.submission);
    renderStageOne();
    renderStageTwo();
    showToast("方案已提交，并同步到教师看板。");
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = `${icon("chart")}AI顾问·多维点评`;
  }
}

async function handleMixedSubmit(event) {
  event.preventDefault();
  const content = dom.mixedContent.value.trim();
  if (!content) {
    showToast("请先填写混合支付策略。");
    return;
  }

  const button = dom.mixedForm.querySelector("button");
  button.disabled = true;
  button.textContent = "提交中...";
  try {
    const risk = getRiskAssessment();
    const result = await api("/api/submissions", {
      method: "POST",
      body: {
        groupId: selectedGroupId,
        scenarioCode: "mixed_payment",
        content,
        paymentStrategy: content,
        riskLevel: risk.riskLevel,
        customerCase: dom.customerCase.value,
        riskAssessment: risk
      }
    });
    upsertSubmission(result.submission);
    renderStageTwo();
    showToast("混合支付策略已同步到教师看板。");
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "提交混合支付策略";
  }
}

async function handleSelfEvaluationSubmit(event) {
  event.preventDefault();
  await submitEvaluation({
    type: "self",
    score: dom.selfScore.value,
    content: dom.selfEvaluationContent.value.trim(),
    button: dom.selfEvaluationForm.querySelector("button"),
    onSuccess: () => {
      dom.selfEvaluationContent.value = "";
      showToast("本组自评已提交到教师看板。");
    }
  });
}

async function handlePeerEvaluationSubmit(event) {
  event.preventDefault();
  await submitEvaluation({
    type: "peer",
    targetGroupId: dom.peerTargetGroup.value,
    score: dom.peerScore.value,
    content: dom.peerEvaluationContent.value.trim(),
    button: dom.peerEvaluationForm.querySelector("button"),
    onSuccess: () => {
      dom.peerEvaluationContent.value = "";
      showToast("小组互评已提交到教师看板。");
    }
  });
}

async function submitEvaluation({ type, targetGroupId, score, content, button, onSuccess }) {
  const studentId = dom.studentSelect.value;
  const student = state.students.find((item) => item.id === studentId);
  if (!student) {
    showToast("请先选择学生姓名。");
    return;
  }
  if (!content) {
    showToast("请先填写评价理由。");
    return;
  }

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "提交中...";
  try {
    const result = await api("/api/evaluations", {
      method: "POST",
      body: {
        type,
        groupId: selectedGroupId,
        studentId,
        targetGroupId,
        score,
        content
      }
    });
    state.evaluations.push(result.evaluation);
    onSuccess();
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function handleReflectionSubmit(event) {
  event.preventDefault();
  const content = dom.reflectionContent.value.trim();
  const studentId = dom.studentSelect.value;
  const student = state.students.find((item) => item.id === studentId);
  if (!content) {
    showToast("请先填写课堂收获与体会。");
    return;
  }

  const button = dom.reflectionForm.querySelector("button");
  button.disabled = true;
  button.textContent = "提交中...";
  try {
    const result = await api("/api/reflections", {
      method: "POST",
      body: {
        groupId: selectedGroupId,
        studentId,
        studentName: student?.name || "学生",
        content
      }
    });
    state.reflections.push(result.reflection);
    dom.reflectionContent.value = "";
    dom.railReflection.classList.add("done");
    showToast("课堂收获已提交，词云会自动更新。");
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "提交课堂收获";
  }
}

async function askAi() {
  const question = dom.aiQuestion.value.trim();
  if (Array.from(question).length < 2) {
    showToast("请至少输入两个字，例如：托收拒付怎么办？");
    dom.aiQuestion.focus();
    return;
  }

  dom.askAiBtn.disabled = true;
  dom.askAiBtn.innerHTML = `${icon("send")}连接中...`;
  currentReply = "我正在连接结算宝，请稍等...";
  dom.assistantReply.textContent = currentReply;

  try {
    const health = await api("/api/health", { timeout: 5000 });
    if (!health.aiConfigured || health.database !== "sqlite") {
      currentReply = "当前后端还是旧版本，请先重启服务后再提问。";
      dom.assistantReply.textContent = currentReply;
      showToast("后端未重启：请运行 ./restart-dev.sh");
      return;
    }

    const result = await api("/api/ai", {
      method: "POST",
      timeout: 26000,
      body: {
        groupId: selectedGroupId,
        question,
        scene: "student_assistant"
      }
    });
    currentReply = result.answer;
    dom.assistantReply.textContent = currentReply;
    dom.aiQuestion.value = "";
    speak(currentReply, { silent: true });
    if (!result.success) {
      showToast("DeepSeek 暂未连通，已使用课堂兜底引导。");
    }
  } catch (error) {
    currentReply = "先从客户信用、货权控制、银行保障和成本四个角度各想一条风险。";
    dom.assistantReply.textContent = currentReply;
    showToast(error.message);
  } finally {
    dom.askAiBtn.disabled = false;
    dom.askAiBtn.innerHTML = `${icon("send")}提问`;
  }
}

function startVoiceInput() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    showToast("当前浏览器不支持语音输入，建议使用 Chrome。");
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  dom.voiceInputBtn.disabled = true;
  dom.voiceInputBtn.innerHTML = `${icon("mic")}聆听中...`;

  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || "";
    dom.aiQuestion.value = text;
    showToast("语音已识别，可以提问。");
  };

  recognition.onerror = () => {
    showToast("语音识别失败，请检查麦克风权限。");
  };

  recognition.onend = () => {
    dom.voiceInputBtn.disabled = false;
    dom.voiceInputBtn.innerHTML = `${icon("mic")}语音输入`;
  };

  recognition.start();
}

function speak(text, options = {}) {
  if (!("speechSynthesis" in window)) {
    if (!options.silent) showToast("当前浏览器不支持语音朗读。");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const preferredVoice = getPreferredVoice();
  utterance.voice = preferredVoice;
  utterance.lang = "zh-CN";
  utterance.rate = 1.02;
  utterance.pitch = preferredVoice?.name && /Xiaoxiao|Xiaochen|Xiaoyi|Yaoyao|Tingting|Meijia|Female|Girl/i.test(preferredVoice.name)
    ? 1.68
    : 1.48;
  utterance.volume = 1;
  if (!preferredVoice && !options.silent) {
    showToast("当前浏览器未发现理想女声音色，已使用系统中文语音。");
  }
  window.speechSynthesis.speak(utterance);
}

function applyCustomerPreset() {
  const selects = Object.fromEntries(
    Array.from(document.querySelectorAll(".risk-select")).map((select) => [select.dataset.risk, select])
  );

  if (dom.customerCase.value.startsWith("SG")) {
    selects.customerCredit.value = "1";
    selects.countryRisk.value = "1";
    selects.productAttribute.value = "1";
    selects.transactionScale.value = "5";
  } else {
    selects.customerCredit.value = "5";
    selects.countryRisk.value = "5";
    selects.productAttribute.value = "3";
    selects.transactionScale.value = "3";
  }

  updateRiskResult();
}

function updateRiskResult() {
  const risk = getRiskAssessment();
  dom.riskScore.textContent = risk.totalScore;
  dom.riskLevelText.textContent = risk.riskLabel;
  dom.riskLevelText.className = `level-badge ${risk.riskLevel}`;
}

function getRiskAssessment() {
  const values = {};
  document.querySelectorAll(".risk-select").forEach((select) => {
    values[select.dataset.risk] = Number(select.value);
  });
  const totalScore = Object.values(values).reduce((sum, value) => sum + value, 0);
  const riskLevel = totalScore <= 6 ? "low" : totalScore <= 12 ? "medium" : "high";
  const riskLabel = riskLevel === "low" ? "低风险交易" : riskLevel === "medium" ? "中风险交易" : "高风险交易";
  return { ...values, totalScore, riskLevel, riskLabel };
}

function getSubmission(scenarioCode) {
  const scenario = state.scenarios.find((item) => item.code === scenarioCode);
  return state.submissions.find((item) => item.groupId === selectedGroupId && item.scenarioId === scenario?.id);
}

function upsertSubmission(submission) {
  const index = state.submissions.findIndex((item) => item.id === submission.id);
  if (index === -1) state.submissions.push(submission);
  else state.submissions[index] = submission;
}

function renderFeedback(submission, scenarioCode = "") {
  if (scenarioCode === "collection_crisis" || scenarioCode === "lc_crisis") {
    return renderThreeDimensionFeedback(submission, scenarioCode);
  }
  return `
    <div class="feedback-box">
      <h4>点评维度 & 智能反馈</h4>
      <div class="feedback-divider"></div>
      ${renderFeedbackContent(submission)}
    </div>
  `;
}

function renderThreeDimensionFeedback(submission, scenarioCode) {
  const analysis = getThreeDimensionFeedback(submission, scenarioCode);
  return `
    <div class="feedback-box feedback-box-dimension">
      <div class="feedback-kicker">${icon("bulb")}三维建议</div>
      <div class="dimension-list">
        ${analysis.dimensions.map((item) => `
          <section class="dimension-item">
            <h5>${escapeHtml(item.title)}</h5>
            <p>${escapeHtml(item.text)}</p>
          </section>
        `).join("")}
      </div>
      <p class="feedback-summary">${icon("chat")}<strong>综合建议：</strong>${escapeHtml(analysis.summary)}</p>
    </div>
  `;
}

function renderFeedbackContent(submission) {
  if (!submission) {
    return `
      <p class="feedback-wait">${icon("light")}等待提交...</p>
      <p class="feedback-message">${icon("chat")}等待提交方案进行点评...</p>
    `;
  }

  return `
    <div class="score-line">
      <span>智能反馈</span>
      <span>评分 ${Number(submission.score || 0)}</span>
    </div>
    <p>${escapeHtml(submission.aiFeedback || "已提交。")}</p>
  `;
}

function getThreeDimensionFeedback(submission, scenarioCode) {
  if (!submission) {
    return {
      dimensions: [
        { title: "对策完整性", text: "提交方案后，这里会按关键动作给出第一组建议。" },
        { title: "可行性", text: "提交方案后，这里会判断方案能否真正落地执行。" },
        { title: "成本控制性", text: "提交方案后，这里会提示时间、费用和损失控制思路。" }
      ],
      summary: "先完成方案，再看结算宝给出的三维点评。"
    };
  }

  const text = String(submission.content || "").replace(/\s+/g, "");
  const rules = scenarioCode === "collection_crisis" ? getCollectionRules() : getLcRules();
  const dimensions = rules.dimensions.map((item) => {
    const matched = item.points.filter((point) => point.test(text));
    const notes = matched.slice(0, 2).map((point) => `✓ ${point.note}`);
    if (!notes.length) {
      notes.push(`△ ${item.fallback}`);
    } else if (matched.length < item.points.length) {
      const missing = item.points.find((point) => !point.test(text));
      if (missing?.missing) notes.push(`△ ${missing.missing}`);
    }
    return {
      title: item.title,
      text: notes.join(" ")
    };
  });

  const strongCount = dimensions.reduce((sum, item) => sum + (item.text.includes("✓") ? 1 : 0), 0);
  const summary = strongCount >= 3
    ? `${rules.summaryGood} ${submission.aiFeedback || ""}`.trim()
    : `${rules.summaryBase} ${submission.aiFeedback || ""}`.trim();

  return { dimensions, summary: summary.slice(0, 120) };
}

function getCollectionRules() {
  return {
    summaryBase: "先稳住货权和证据链，再补强客户沟通与备选处置动作。",
    summaryGood: "策略主线比较清楚，可以尽快落到货权、沟通和损失控制三步执行。",
    dimensions: [
      {
        title: "对策完整性",
        fallback: "可以再补上货权控制、客户沟通和备选买家这三类动作。",
        points: [
          {
            test: (text) => /货权|提单|单据|物权/.test(text),
            note: "提到了货权或单据控制。",
            missing: "还可以补充货权在谁手里、如何防止货物失控。"
          },
          {
            test: (text) => /客户|沟通|协商|催收|谈判/.test(text),
            note: "提到了与客户协商或催收。",
            missing: "建议再写清先沟通什么条件、争取什么结果。"
          },
          {
            test: (text) => /转卖|转售|买家|保险|索赔|追偿/.test(text),
            note: "考虑了转售、索赔或备选买家。",
            missing: "可以补一个客户仍拒付时的备用处置方案。"
          }
        ]
      },
      {
        title: "可行性",
        fallback: "建议把先后顺序写清，例如先控货、再沟通、最后启动备选方案。",
        points: [
          {
            test: (text) => /先|再|随后|第一|第二|第三/.test(text),
            note: "已经体现出处理顺序。",
            missing: "如果能写成分步骤执行，落地感会更强。"
          },
          {
            test: (text) => /银行|托收行|代收行|承兑|付款/.test(text),
            note: "考虑到了银行或收款环节。",
            missing: "可再补一句银行、单据或付款节点怎么配合。"
          },
          {
            test: (text) => /改单|换单|退运|仓储|转运/.test(text),
            note: "提到了具体操作动作。",
            missing: "建议补充一项可执行动作，避免方案停留在原则层面。"
          }
        ]
      },
      {
        title: "成本控制性",
        fallback: "可以补充降价、仓储、改运或索赔等损失控制办法。",
        points: [
          {
            test: (text) => /降价|折扣|优惠|让利/.test(text),
            note: "提到了价格让步或优惠交换。",
            missing: "如果涉及让利，建议再说明换来什么回款保障。"
          },
          {
            test: (text) => /费用|成本|损失|仓储|滞港|运费/.test(text),
            note: "关注到了费用或损失控制。",
            missing: "还可以补一句哪些费用最需要优先压住。"
          },
          {
            test: (text) => /索赔|保险|追偿/.test(text),
            note: "考虑了保险或索赔回收。",
            missing: "可再想想能否用保险或追偿减少最终损失。"
          }
        ]
      }
    ]
  };
}

function getLcRules() {
  return {
    summaryBase: "先锁定不符点，再围绕改证、单据补救和银行沟通补强方案。",
    summaryGood: "思路已经接近完整，可继续把不符点补救与费用承担写得更具体。",
    dimensions: [
      {
        title: "对策完整性",
        fallback: "建议至少覆盖不符点识别、改证补救和银行沟通三类动作。",
        points: [
          {
            test: (text) => /不符|单据|单证|条款/.test(text),
            note: "识别到了不符点或单证问题。",
            missing: "可以再明确到底是哪一项单证或条款产生不符。"
          },
          {
            test: (text) => /改证|修改信用证|修证|重开/.test(text),
            note: "提到了改证或修改信用证。",
            missing: "如果改证可行，建议写清由谁发起、改什么条款。"
          },
          {
            test: (text) => /银行|开证行|议付行|通知行/.test(text),
            note: "考虑了银行沟通环节。",
            missing: "建议补上与开证行或议付行沟通的动作。"
          }
        ]
      },
      {
        title: "可行性",
        fallback: "建议写清先补证据还是先改证，处理顺序越明确越好。",
        points: [
          {
            test: (text) => /港口|变更|苏哈尔|杰贝阿里|目的港/.test(text),
            note: "抓到了港口变化这个核心问题。",
            missing: "还可以补一句港口变更需要哪些佐证文件。"
          },
          {
            test: (text) => /证明|函|说明|确认|通知/.test(text),
            note: "考虑了补充证明或书面说明。",
            missing: "建议补一类证明文件，让方案更能落地。"
          },
          {
            test: (text) => /先|再|随后|第一|第二|第三/.test(text),
            note: "体现出了处理步骤。",
            missing: "如果能分成先后步骤，执行感会更清楚。"
          }
        ]
      },
      {
        title: "成本控制性",
        fallback: "可以补充改证费、改单费、滞港费或让步成本由谁承担。",
        points: [
          {
            test: (text) => /费用|成本|损失|改证费|改单费/.test(text),
            note: "考虑到了改证或改单成本。",
            missing: "建议明确哪些费用可能增加，谁来承担。"
          },
          {
            test: (text) => /承担|分摊|协商|让步/.test(text),
            note: "提到了费用承担或协商机制。",
            missing: "可再补一句费用承担谈判的底线。"
          },
          {
            test: (text) => /时间|尽快|时效|到港|出单/.test(text),
            note: "关注到了时效和窗口期。",
            missing: "建议再强调一下时间拖延可能带来的额外损失。"
          }
        ]
      }
    ]
  };
}

function initSpeechVoices() {
  if (!("speechSynthesis" in window)) return;
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

function getPreferredVoice() {
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  const namedPriority = [
    /Xiaoxiao/i,
    /Xiaoyi/i,
    /Xiaochen/i,
    /Yaoyao/i,
    /Tingting/i,
    /Meijia/i,
    /Mei/i,
    /Huihui/i,
    /Female.*Chinese/i,
    /Female|Girl/i
  ];
  for (const pattern of namedPriority) {
    const matched = voices.find((voice) => /zh/i.test(voice.lang) && pattern.test(voice.name));
    if (matched) return matched;
  }
  return (
    voices.find((voice) => /zh/i.test(voice.lang) && /(Xiao|Yao|Ting|Mei|Hui|Female|Girl)/i.test(voice.name)) ||
    voices.find((voice) => /zh/i.test(voice.lang)) ||
    null
  );
}

function stageTwoKey() {
  return `tradepilot.stageTwo.${selectedGroupId}`;
}

async function api(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "请求失败，请稍后重试。");
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("请求超时，请确认服务已重启并能访问 DeepSeek。");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => dom.toast.classList.remove("show"), 2400);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name) {
  const icons = {
    hand: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8"/><path d="M9 6h6"/><path d="M12 11c-2.5 0-4 1-4 2.5S10 16 12 16s4-1 4-2.5S14.5 11 12 11Z"/><path d="M3 17h4l3 2h6l5-4"/><path d="M3 21h18"/></svg>`,
    invoice: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 11h6"/><path d="M9 15h6"/><path d="M12 9v9"/></svg>`,
    alert: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 21h20z"/><path d="M12 9v5"/><path d="M12 17h.01"/></svg>`,
    bulb: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14c-1.2-1-2-2.5-2-4a6 6 0 1 1 12 0c0 1.5-.8 3-2 4-.8.7-1 1.4-1 2H9c0-.6-.2-1.3-1-2Z"/></svg>`,
    file: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>`,
    edit: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m14 6 4 4"/><path d="M13 20h7"/></svg>`,
    chart: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 3 5-7"/></svg>`,
    light: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a6 6 0 0 0-3 11c.7.5 1 1.2 1 2h4c0-.8.3-1.5 1-2a6 6 0 0 0-3-11Z"/></svg>`,
    chat: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/></svg>`
    ,
    mic: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>`,
    send: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>`
  };
  return icons[name] || "";
}
