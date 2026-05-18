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
  selfEvaluationContent: document.querySelector("#selfEvaluationContent"),
  peerEvaluationForm: document.querySelector("#peerEvaluationForm"),
  peerTargetGroup: document.querySelector("#peerTargetGroup"),
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
  dom.stageTwoStatus.textContent = mixed ? "已提交" : "未提交";
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
    content: dom.peerEvaluationContent.value.trim(),
    button: dom.peerEvaluationForm.querySelector("button"),
    onSuccess: () => {
      dom.peerEvaluationContent.value = "";
      showToast("小组互评已提交到教师看板。");
    }
  });
}

async function submitEvaluation({ type, targetGroupId, content, button, onSuccess }) {
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
  const complete = rules.isComplete(text);
  const dimensions = rules.dimensions.map((item) => {
    const matched = item.points.filter((point) => point.test(text));
    const notes = matched.map((point) => `✓ ${point.note}`);
    if (!notes.length) {
      notes.push(`△ ${item.fallback}`);
    }
    return {
      title: item.title,
      text: notes.join(" ")
    };
  });

  const summary = complete
    ? `${rules.summaryGood} ${submission.aiFeedback || ""}`.trim()
    : `${rules.summaryBase} ${submission.aiFeedback || ""}`.trim();

  return { dimensions, summary: summary.slice(0, 120) };
}

function getCollectionRules() {
  const hasDiscount = (text) => /降价|折扣|优惠|让利|减价|价格/.test(text);
  const hasResale = (text) => /转售|转卖|他国|其他国家|第三国|另找买家|其他买家/.test(text);
  const hasReturn = (text) => /退运|退货回国|运回国|退回国内|返回国内/.test(text);
  const isComplete = (text) => hasDiscount(text) && hasResale(text) && hasReturn(text);

  return {
    isComplete,
    summaryBase: "托收对策按三条核对：协商降价促成履约、转售他国、退运回国。",
    summaryGood: "托收三项处理对策已覆盖完整。",
    dimensions: [
      {
        title: "对策完整性",
        fallback: "完整对策应包含：协商降价促成履约、将货物转售他国、安排货物退运回国。",
        points: [
          {
            test: hasDiscount,
            note: "写到了协商降价促成履约。"
          },
          {
            test: hasResale,
            note: "写到了将货物转售他国。"
          },
          {
            test: hasReturn,
            note: "写到了安排货物退运回国。"
          }
        ]
      },
      {
        title: "可行性",
        fallback: "处理路径应覆盖继续履约、替代销售、退运兜底三种选择。",
        points: [
          {
            test: isComplete,
            note: "三条处理路径完整，能覆盖主要处置选择。"
          }
        ]
      },
      {
        title: "成本控制性",
        fallback: "成本控制重点看降价履约、转售止损、退运止损是否都写到。",
        points: [
          {
            test: isComplete,
            note: "已覆盖降价、转售、退运三种损失控制方式。"
          }
        ]
      }
    ]
  };
}

function getLcRules() {
  const hasAmend = (text) => /改证|修改信用证|修证|修改L\/?C|更改信用证/.test(text);
  const hasShundaCost = (text) => /顺达|我方|卖方|工贸/.test(text) && /费用|承担|改证费|成本/.test(text);
  const hasBuyDocs = (text) => /买单|接受不符点|接受单据|接受单证|付款赎单/.test(text);
  const hasDiscount = (text) => /降价|折扣|优惠|让利|减价|价格/.test(text);
  const isComplete = (text) => hasAmend(text) && hasShundaCost(text) && hasBuyDocs(text) && hasDiscount(text);

  return {
    isComplete,
    summaryBase: "信用证对策按两条核对：协商修改信用证且改证费用由顺达工贸承担；协商买单并给予买方降价优惠。",
    summaryGood: "信用证两项处理对策已覆盖完整。",
    dimensions: [
      {
        title: "对策完整性",
        fallback: "完整对策应包含：协商修改信用证、协商买单并给予买方降价优惠。",
        points: [
          {
            test: hasAmend,
            note: "写到了协商修改信用证。"
          },
          {
            test: (text) => hasBuyDocs(text) && hasDiscount(text),
            note: "写到了协商买单并给予买方降价优惠。"
          }
        ]
      },
      {
        title: "可行性",
        fallback: "可行方案应同时覆盖改证处理和买单优惠处理。",
        points: [
          {
            test: isComplete,
            note: "两条处理路径完整，能够覆盖改证和买单两种处置。"
          }
        ]
      },
      {
        title: "成本控制性",
        fallback: "成本控制重点看改证费用承担和买方降价优惠是否写清。",
        points: [
          {
            test: hasShundaCost,
            note: "写到了改证费用由顺达工贸承担。"
          },
          {
            test: hasDiscount,
            note: "写到了给予买方降价优惠。"
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
