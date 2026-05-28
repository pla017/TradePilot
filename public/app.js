const dom = {
  groupSelect: document.querySelector("#groupSelect"),
  groupSelectHidden: document.querySelector("#groupSelectHidden"),
  currentGroupName: document.querySelector("#currentGroupName"),
  miniCollection: document.querySelector("#miniCollection"),
  miniLc: document.querySelector("#miniLc"),
  miniMixed: document.querySelector("#miniMixed"),
  preQuizForm: document.querySelector("#preQuizForm"),
  preQuizStudentSelect: document.querySelector("#preQuizStudentSelect"),
  preQuizQuestions: document.querySelector("#preQuizQuestions"),
  preQuizResult: document.querySelector("#preQuizResult"),
  preQuizStatus: document.querySelector("#preQuizStatus"),
  postQuizForm: document.querySelector("#postQuizForm"),
  postQuizStudentSelect: document.querySelector("#postQuizStudentSelect"),
  postQuizQuestions: document.querySelector("#postQuizQuestions"),
  postQuizResult: document.querySelector("#postQuizResult"),
  postQuizStatus: document.querySelector("#postQuizStatus"),
  mixExamForm: document.querySelector("#mixExamForm"),
  mixExamStudentSelect: document.querySelector("#mixExamStudentSelect"),
  mixExamContent: document.querySelector("#mixExamContent"),
  mixExamFeedback: document.querySelector("#mixExamFeedback"),
  mixExamRiskScore: document.querySelector("#mixExamRiskScore"),
  mixExamRiskLevelText: document.querySelector("#mixExamRiskLevelText"),
  mixExamStatus: document.querySelector("#mixExamStatus"),
  studentSelect: document.querySelector("#studentSelect"),
  reflectionStudentName: document.querySelector("#reflectionStudentName"),
  stageOneGrid: document.querySelector("#stageOneGrid"),
  stageOneStatus: document.querySelector("#stageOneStatus"),
  railStageOne: document.querySelector("#railStageOne"),
  railStageTwo: document.querySelector("#railStageTwo"),
  railPreQuiz: document.querySelector("#railPreQuiz"),
  railPostQuiz: document.querySelector("#railPostQuiz"),
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
  evaluationSection: document.querySelector(".evaluation-section"),
  selfEvaluationForm: document.querySelector("#selfEvaluationForm"),
  selfRatingMatrix: document.querySelector("#selfRatingMatrix"),
  selfRadarChart: document.querySelector("#selfRadarChart"),
  peerEvaluationForm: document.querySelector("#peerEvaluationForm"),
  peerTargetGroup: document.querySelector("#peerTargetGroup"),
  peerMemberRatings: document.querySelector("#peerMemberRatings"),
  aiQuestion: document.querySelector("#aiQuestion"),
  askAiBtn: document.querySelector("#askAiBtn"),
  voiceInputBtn: document.querySelector("#voiceInputBtn"),
  assistantReply: document.querySelector("#assistantReply p"),
  speakReplyBtn: document.querySelector("#speakReplyBtn"),
  toast: document.querySelector("#toast")
};

const SELF_EVALUATION_DIMENSIONS = [
  { key: "attitude", label: "学习态度" },
  { key: "collaboration", label: "协作贡献" },
  { key: "riskResponse", label: "风险应对能力" },
  { key: "literacy", label: "素养体悟" },
  { key: "businessInsight", label: "商业思维领悟" }
];

const PEER_EVALUATION_DIMENSIONS = [
  { key: "contribution", label: "参与贡献度" },
  { key: "communication", label: "沟通表达" },
  { key: "teamwork", label: "团队协作" }
];

const PRE_QUIZ_QUESTIONS = [
  { text: "预付款（T/T in advance）对于出口商而言，最主要的优点是？", options: ["资金占用少", "手续简便", "收汇安全有保障", "客户易接受"], correct: 2 },
  { text: "信用证（L/C）依据什么进行分类？", options: ["是否可撤销", "付款时间", "是否有保兑", "以上都是"], correct: 3 },
  { text: "以下哪种支付方式属于银行信用？", options: ["托收（D/P）", "信用证（L/C）", "预付款", "赊销"], correct: 1 },
  { text: "托收结算中，D/P和D/A的主要区别在于？", options: ["交单时间不同", "是否需要单据", "银行责任不同", "手续费不同"], correct: 0 },
  { text: "信用证结算流程中，开证行承担的责任是？", options: ["审单付款", "协助出口商发货", "调查进口商资信", "安排运输"], correct: 0 },
  { text: "以下关于托收特点的描述，错误的是？", options: ["银行不承担付款责任", "托收属于银行信用", "出口商收汇有保证", "手续相对简单"], correct: 2 },
  { text: "预付款结算方式对进口商的主要风险是？", options: ["资金占用", "收货风险", "汇率波动", "单据不符"], correct: 1 },
  { text: "信用证项下，开证行付款的前提是？", options: ["进口商同意", "出口商发货", "相符交单", "货物到港"], correct: 2 },
  { text: "托收方式中，代收行是否承担付款责任？", options: ["承担", "不承担", "视情况而定", "部分承担"], correct: 1 },
  { text: "以下哪项不属于预付款的优点？", options: ["收汇安全", "资金周转快", "客户易接受", "手续简单"], correct: 2 }
];

const POST_QUIZ_QUESTIONS = [
  { text: "托收方式下进口商因反倾销税骤增拒付，不合理措施？", options: ["协商降价", "立即退运", "转售第三方", "要求银行付款"], correct: 3 },
  { text: "信用证不符，最优先？", options: ["改证", "接受不符点折扣", "放弃货物", "起诉开证行"], correct: 0 },
  { text: "高风险交易最安全支付组合？", options: ["100%预付款", "100%信用证", "高比例预付+信用证", "预付+托收"], correct: 2 },
  { text: "互利共赢思维体现？", options: ["全额预付", "只接受L/C", "根据风险设计支付", "拒绝让步"], correct: 2 },
  { text: "托收拒付成本控制性较高做法？", options: ["高价律师", "空运退回", "协商降价转售", "弃货"], correct: 2 },
  { text: "设计混合支付首要依据？", options: ["客户喜好", "风险等级", "银行建议", "汇率"], correct: 1 },
  { text: "信用证单据不符最直接风险？", options: ["无法结汇", "海关扣押", "运费增加", "货物损毁"], correct: 0 },
  { text: "D/A比D/P风险更高因为？", options: ["银行不参与", "先提货后付款", "单据丢失", "手续费高"], correct: 1 },
  { text: "预付款进口商风险如何缓解？", options: ["银行保函", "改用L/C", "提高预付", "缩短交货"], correct: 0 },
  { text: "托收拒付货物转售最有利因素？", options: ["定制产品", "标准化产品", "到港超30天", "特殊标识"], correct: 1 }
];

let state = null;
let selectedGroupId = localStorage.getItem("tradepilot.groupId") || "g1";
let currentReply = dom.assistantReply.textContent;
let cachedVoices = [];
const evaluationDrafts = {
  self: {},
  peer: {}
};

init();

async function init() {
  bindEvents();
  initSpeechVoices();
  await loadState();
  renderAll();
}

function bindEvents() {
  [dom.groupSelect, dom.groupSelectHidden].filter(Boolean).forEach((select) => {
    select.addEventListener("change", handleGroupChange);
  });
  [dom.preQuizStudentSelect, dom.postQuizStudentSelect, dom.mixExamStudentSelect].filter(Boolean).forEach((select) => {
    select.addEventListener("change", () => {
      localStorage.setItem(quizStudentKey(select.id), select.value);
      renderQuizzes();
      renderMixExam();
    });
  });
  dom.studentSelect.addEventListener("change", () => {
    localStorage.setItem(selectedStudentKey(), dom.studentSelect.value);
    renderReflectionStudentName();
    renderSelfEvaluation();
    renderPeerEvaluation();
  });
  dom.peerTargetGroup.addEventListener("change", () => {
    localStorage.setItem(peerTargetKey(), dom.peerTargetGroup.value);
    renderPeerEvaluation();
  });
  dom.evaluationSection.addEventListener("click", handleStarSelection);

  dom.stageOneGrid.addEventListener("submit", handleScenarioSubmit);
  dom.preQuizForm.addEventListener("submit", (event) => handleQuizSubmit(event, "pre"));
  dom.postQuizForm.addEventListener("submit", (event) => handleQuizSubmit(event, "post"));

  dom.nextStageBtn.addEventListener("click", () => {
    localStorage.setItem(stageTwoKey(), "open");
    renderStageTwo();
    dom.stageTwo.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  dom.mixedForm.addEventListener("submit", handleMixedSubmit);
  dom.mixExamForm.addEventListener("submit", handleMixExamSubmit);

  document.querySelectorAll(".risk-select").forEach((select) => {
    select.addEventListener("change", updateRiskResult);
  });
  document.querySelectorAll(".mix-exam-risk-select").forEach((select) => {
    select.addEventListener("change", updateMixExamRiskResult);
  });

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

function handleGroupChange(event) {
  selectedGroupId = event.currentTarget.value;
  localStorage.setItem("tradepilot.groupId", selectedGroupId);
  renderAll();
}

async function loadState() {
  state = normalizeBootstrapState(await api("/api/bootstrap"));
  if (!state.groups.some((group) => group.id === selectedGroupId)) {
    selectedGroupId = state.groups[0]?.id || "g1";
  }
}

function normalizeBootstrapState(rawState) {
  return {
    ...rawState,
    students: (rawState.students || []).filter((student) => !isGroupRepresentativeStudent(student))
  };
}

function isGroupRepresentativeStudent(student) {
  return /^第(?:[1-7]|[一二三四五六七])组代表$/.test(String(student?.name || "").trim());
}

function renderAll() {
  renderGroupSelect();
  renderGroupContext();
  renderStudentSelect();
  renderQuizStudentSelects();
  renderReflectionStudentName();
  renderPeerTargetGroups();
  renderQuizzes();
  renderMixExam();
  renderSelfEvaluation();
  renderPeerEvaluation();
  renderStageOne();
  renderStageTwo();
  dom.railReflection.classList.toggle(
    "done",
    state.reflections.some((item) => item.groupId === selectedGroupId)
  );
  updateRiskResult();
}

function renderGroupSelect() {
  const options = state.groups
    .map((group) => `<option value="${group.id}" ${group.id === selectedGroupId ? "selected" : ""}>${escapeHtml(group.name)}</option>`)
    .join("");
  [dom.groupSelect, dom.groupSelectHidden].filter(Boolean).forEach((select) => {
    select.innerHTML = options;
    select.value = selectedGroupId;
  });
}

function renderGroupContext() {
  const group = state.groups.find((item) => item.id === selectedGroupId);
  const groupName = currentGroupName();
  dom.currentGroupName.textContent = groupName;

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
  const savedStudentId = localStorage.getItem(selectedStudentKey());
  const currentValue = students.some((student) => student.id === dom.studentSelect.value)
    ? dom.studentSelect.value
    : savedStudentId;
  const fallbackValue = currentValue && students.some((student) => student.id === currentValue)
    ? currentValue
    : students[0]?.id || "";
  dom.studentSelect.innerHTML = students
    .map((student) => `<option value="${student.id}" ${student.id === fallbackValue ? "selected" : ""}>${escapeHtml(student.name)}</option>`)
    .join("");
  if (fallbackValue) {
    dom.studentSelect.value = fallbackValue;
    localStorage.setItem(selectedStudentKey(), fallbackValue);
  }
}

function renderQuizStudentSelects() {
  [
    dom.preQuizStudentSelect,
    dom.postQuizStudentSelect,
    dom.mixExamStudentSelect
  ].filter(Boolean).forEach((select) => renderStudentOptions(select, quizStudentKey(select.id)));
}

function renderStudentOptions(select, storageKey) {
  const students = state.students.filter((student) => student.groupId === selectedGroupId);
  const savedStudentId = localStorage.getItem(storageKey);
  const currentValue = students.some((student) => student.id === select.value) ? select.value : savedStudentId;
  const fallbackValue = currentValue && students.some((student) => student.id === currentValue)
    ? currentValue
    : students[0]?.id || "";
  select.innerHTML = students
    .map((student) => `<option value="${student.id}" ${student.id === fallbackValue ? "selected" : ""}>${escapeHtml(student.name)}</option>`)
    .join("");
  if (fallbackValue) {
    select.value = fallbackValue;
    localStorage.setItem(storageKey, fallbackValue);
  }
}

function quizStudentKey(selectId) {
  return `tradepilot.${selectId}.${selectedGroupId}`;
}

function renderQuizzes() {
  renderQuiz("pre", PRE_QUIZ_QUESTIONS, dom.preQuizQuestions);
  renderQuiz("post", POST_QUIZ_QUESTIONS, dom.postQuizQuestions);
  renderQuizStatus("pre", dom.preQuizStudentSelect, dom.preQuizStatus, dom.railPreQuiz);
  renderQuizStatus("post", dom.postQuizStudentSelect, dom.postQuizStatus, dom.railPostQuiz);
  dom.preQuizResult.hidden = true;
  dom.postQuizResult.hidden = true;
}

function renderQuiz(type, questions, container) {
  if (!container) return;
  container.innerHTML = questions
    .map((question, questionIndex) => `
      <fieldset class="quiz-question">
        <legend>${questionIndex + 1}. ${escapeHtml(question.text)}</legend>
        <div class="quiz-options">
          ${question.options.map((option, optionIndex) => `
            <label>
              <input type="radio" name="${type}_quiz_${questionIndex}" value="${optionIndex}" />
              <span>${escapeHtml(option)}</span>
            </label>
          `).join("")}
        </div>
      </fieldset>
    `)
    .join("");
}

function renderQuizStatus(type, select, statusElement, railElement) {
  const attempt = getQuizAttempt(type, select?.value);
  const done = Boolean(attempt);
  statusElement.textContent = done ? `已提交 ${attempt.score}/${attempt.total}` : "未提交";
  statusElement.classList.toggle("done", done);
  railElement?.classList.toggle("done", hasGroupQuizAttempt(type));
}

function renderReflectionStudentName() {
  const student = state.students.find((item) => item.id === dom.studentSelect.value);
  dom.reflectionStudentName.textContent = student ? `${student.name}（${currentGroupName()}）` : "请先选择学生姓名";
}

function renderPeerTargetGroups() {
  const options = state.groups.filter((group) => group.id !== selectedGroupId);
  const savedTargetId = localStorage.getItem(peerTargetKey());
  const currentValue = options.some((group) => group.id === dom.peerTargetGroup.value)
    ? dom.peerTargetGroup.value
    : savedTargetId;
  const fallbackValue = currentValue && options.some((group) => group.id === currentValue)
    ? currentValue
    : options[0]?.id || "";
  dom.peerTargetGroup.innerHTML = options
    .map((group) => `<option value="${group.id}" ${group.id === fallbackValue ? "selected" : ""}>${escapeHtml(group.name)}</option>`)
    .join("");
  if (fallbackValue) {
    dom.peerTargetGroup.value = fallbackValue;
    localStorage.setItem(peerTargetKey(), fallbackValue);
  }
}

function renderSelfEvaluation() {
  const student = currentStudent();
  const draft = getSelfEvaluationDraft(student?.id);

  dom.selfRatingMatrix.innerHTML = SELF_EVALUATION_DIMENSIONS
    .map((dimension) => `
      <section class="rating-row">
        <strong>${escapeHtml(dimension.label)}</strong>
        <div class="star-rating" role="radiogroup" aria-label="${escapeHtml(dimension.label)}">
          ${renderStars({
            type: "self",
            dimensionKey: dimension.key,
            value: draft[dimension.key] || 0
          })}
        </div>
      </section>
    `)
    .join("");

  dom.selfRadarChart.innerHTML = renderRadarSvg(draft);
}

function renderPeerEvaluation() {
  const targetGroupId = dom.peerTargetGroup.value;
  const targetStudents = state.students.filter((student) => student.groupId === targetGroupId);
  const targetGroupName = state.groups.find((group) => group.id === targetGroupId)?.name || "目标小组";

  if (!targetStudents.length) {
    dom.peerMemberRatings.innerHTML = `<div class="peer-empty">当前小组暂无可评价成员。</div>`;
    return;
  }

  dom.peerMemberRatings.innerHTML = targetStudents
    .map((student) => {
      const draft = getPeerEvaluationDraft(student.id, targetGroupId);
      return `
        <article class="peer-member-card">
          <strong>${escapeHtml(student.name)}</strong>
          <span class="peer-member-group">${escapeHtml(targetGroupName)}</span>
          <div class="peer-dimension-list">
            ${PEER_EVALUATION_DIMENSIONS.map((dimension) => `
              <section class="peer-dimension-row">
                <span>${escapeHtml(dimension.label)}</span>
                <div class="star-rating compact" role="radiogroup" aria-label="${escapeHtml(student.name)}${escapeHtml(dimension.label)}">
                  ${renderStars({
                    type: "peer",
                    studentId: student.id,
                    targetGroupId,
                    dimensionKey: dimension.key,
                    value: draft[dimension.key] || 0
                  })}
                </div>
              </section>
            `).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderStars({ type, dimensionKey, value, studentId = "", targetGroupId = "" }) {
  return Array.from({ length: 5 }, (_, index) => {
    const starValue = index + 1;
    const active = starValue <= value;
    return `
      <button
        class="star-button ${active ? "active" : ""}"
        type="button"
        data-rating-type="${type}"
        data-dimension="${dimensionKey}"
        data-value="${starValue}"
        data-student-id="${studentId}"
        data-target-group-id="${targetGroupId}"
        aria-label="${starValue}星"
        aria-pressed="${active ? "true" : "false"}"
      >★</button>
    `;
  }).join("");
}

function renderRadarSvg(ratings) {
  const values = SELF_EVALUATION_DIMENSIONS.map((dimension) => Number(ratings[dimension.key] || 0) * 2);
  const maxValue = 10;
  const centerX = 150;
  const centerY = 156;
  const radius = 102;
  const levels = [2, 4, 6, 8, 10];

  const rings = levels.map((level) => polygonPoints(SELF_EVALUATION_DIMENSIONS.length, radius * (level / maxValue), centerX, centerY)).join("");
  const axes = SELF_EVALUATION_DIMENSIONS.map((dimension, index) => {
    const point = axisPoint(index, SELF_EVALUATION_DIMENSIONS.length, radius, centerX, centerY);
    return `<line x1="${centerX}" y1="${centerY}" x2="${point.x}" y2="${point.y}" />`;
  }).join("");

  const valuePoints = SELF_EVALUATION_DIMENSIONS.map((dimension, index) =>
    axisPoint(index, SELF_EVALUATION_DIMENSIONS.length, radius * ((Number(ratings[dimension.key] || 0) * 2) / maxValue), centerX, centerY)
  );
  const polygon = valuePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const labels = SELF_EVALUATION_DIMENSIONS.map((dimension, index) => {
    const labelPoint = axisPoint(index, SELF_EVALUATION_DIMENSIONS.length, radius + 30, centerX, centerY);
    return `<text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="${labelAnchor(index)}">${escapeHtml(dimension.label)}</text>`;
  }).join("");

  return `
    <svg viewBox="0 0 300 312" class="radar-svg" aria-label="自评雷达图">
      <g class="radar-grid">${rings}</g>
      <g class="radar-axes">${axes}</g>
      <g class="radar-scale">${[10, 8, 6, 4, 2].map((level) => `<text x="${centerX}" y="${centerY - radius * (level / maxValue) + 6}">${level}</text>`).join("")}</g>
      <polygon class="radar-area" points="${polygon}" />
      <polyline class="radar-line" points="${polygon}" />
      ${valuePoints.map((point) => `<circle class="radar-dot" cx="${point.x}" cy="${point.y}" r="4.6" />`).join("")}
      <g class="radar-labels">${labels}</g>
    </svg>
  `;
}

function polygonPoints(sides, radius, centerX, centerY) {
  return `<polygon points="${Array.from({ length: sides }, (_, index) => {
    const point = axisPoint(index, sides, radius, centerX, centerY);
    return `${point.x},${point.y}`;
  }).join(" ")}" />`;
}

function axisPoint(index, total, radius, centerX, centerY) {
  const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / total;
  return {
    x: Number((centerX + Math.cos(angle) * radius).toFixed(2)),
    y: Number((centerY + Math.sin(angle) * radius).toFixed(2))
  };
}

function labelAnchor(index) {
  if (index === 0) return "middle";
  if (index === 1 || index === 2) return "start";
  if (index === 3 || index === 4) return "end";
  return "middle";
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
    dom.mixedFeedback.className = "feedback-box feedback-box-dimension feedback-box-mixed";
    dom.mixedFeedback.innerHTML = renderMixedDimensionFeedback(mixed);
  } else {
    dom.mixedFeedback.className = "feedback-box";
    dom.mixedFeedback.hidden = true;
  }
}

function handleStarSelection(event) {
  const button = event.target.closest(".star-button");
  if (!button) return;

  const value = Number(button.dataset.value || 0);
  const dimensionKey = button.dataset.dimension || "";
  const ratingType = button.dataset.ratingType || "";

  if (ratingType === "self") {
    const student = currentStudent();
    const draft = getSelfEvaluationDraft(student?.id);
    draft[dimensionKey] = value;
    renderSelfEvaluation();
    return;
  }

  if (ratingType === "peer") {
    const targetGroupId = button.dataset.targetGroupId || dom.peerTargetGroup.value;
    const studentId = button.dataset.studentId || "";
    const draft = getPeerEvaluationDraft(studentId, targetGroupId);
    draft[dimensionKey] = value;
    renderPeerEvaluation();
  }
}

async function handleQuizSubmit(event, type) {
  event.preventDefault();
  const questions = type === "pre" ? PRE_QUIZ_QUESTIONS : POST_QUIZ_QUESTIONS;
  const select = type === "pre" ? dom.preQuizStudentSelect : dom.postQuizStudentSelect;
  const resultBox = type === "pre" ? dom.preQuizResult : dom.postQuizResult;
  const button = event.currentTarget.querySelector("button");
  const answers = questions.map((question, index) => {
    const selected = document.querySelector(`input[name="${type}_quiz_${index}"]:checked`);
    const selectedIndex = selected ? Number(selected.value) : null;
    return {
      question: question.text,
      selectedIndex,
      selectedText: selectedIndex === null ? "未答" : question.options[selectedIndex],
      correctIndex: question.correct,
      correctText: question.options[question.correct],
      correct: selectedIndex === question.correct
    };
  });

  const missingIndex = answers.findIndex((answer) => answer.selectedIndex === null);
  if (missingIndex !== -1) {
    showToast(`请先完成第 ${missingIndex + 1} 题。`);
    return;
  }

  const score = answers.filter((answer) => answer.correct).length;
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "提交中...";
  try {
    const result = await api("/api/quiz-attempts", {
      method: "POST",
      body: {
        quizType: type,
        groupId: selectedGroupId,
        studentId: select.value,
        score,
        total: questions.length,
        answers
      }
    });
    upsertQuizAttempt(result.attempt);
    renderQuizzes();
    renderQuizResult(resultBox, score, questions.length, answers);
    showToast(`${type === "pre" ? "课前" : "课后"}小测已同步到教师看板。`);
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function renderQuizResult(resultBox, score, total, answers) {
  resultBox.hidden = false;
  resultBox.innerHTML = `
    <strong>得分：${score}/${total}</strong>
    <div class="quiz-result-list">
      ${answers.map((answer, index) => `
        <p>
          <span>${index + 1}. ${escapeHtml(answer.question)}</span>
          <em class="${answer.correct ? "correct" : "wrong"}">${answer.correct ? "正确" : "需复盘"}</em>
        </p>
      `).join("")}
    </div>
  `;
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
    if (!risk.complete) {
      showToast("请先手工完成四项风险评估。");
      return;
    }
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

async function handleMixExamSubmit(event) {
  event.preventDefault();
  const content = dom.mixExamContent.value.trim();
  if (!content) {
    showToast("请先填写课后混合支付策略。");
    return;
  }

  const risk = getMixExamRiskAssessment();
  const analysis = getMixedPaymentDimensionFeedback({
    content,
    paymentStrategy: content,
    riskLevel: risk.riskLevel
  });
  const score = Number((analysis.dimensions.reduce((sum, item) => sum + Number(item.score || 0), 0) / analysis.dimensions.length).toFixed(1));
  const button = dom.mixExamForm.querySelector("button");
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "提交中...";

  try {
    const result = await api("/api/quiz-attempts", {
      method: "POST",
      body: {
        quizType: "mix_exam",
        groupId: selectedGroupId,
        studentId: dom.mixExamStudentSelect.value,
        score,
        total: 10,
        content,
        riskLevel: risk.riskLevel,
        riskAssessment: risk,
        feedback: analysis.summary
      }
    });
    upsertQuizAttempt(result.attempt);
    dom.mixExamFeedback.hidden = false;
    dom.mixExamFeedback.innerHTML = renderMixedDimensionFeedback({
      content,
      paymentStrategy: content,
      riskLevel: risk.riskLevel
    });
    renderMixExam();
    showToast("课后混合支付策略已同步到教师看板。");
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function handleSelfEvaluationSubmit(event) {
  event.preventDefault();
  const student = currentStudent();
  const draft = getSelfEvaluationDraft(student?.id);
  const missing = SELF_EVALUATION_DIMENSIONS.find((dimension) => !draft[dimension.key]);
  if (missing) {
    showToast(`请先完成“${missing.label}”评分。`);
    return;
  }

  const average = averageDimensionScore(draft, SELF_EVALUATION_DIMENSIONS);
  await submitEvaluation({
    type: "self",
    score: average,
    content: buildSelfEvaluationSummary(student, draft, average),
    button: dom.selfEvaluationForm.querySelector("button"),
    onSuccess: () => {
      resetSelfEvaluationDraft(student?.id);
      renderSelfEvaluation();
      showToast("本组自评已提交到教师看板。");
    }
  });
}

async function handlePeerEvaluationSubmit(event) {
  event.preventDefault();
  const targetGroupId = dom.peerTargetGroup.value;
  const targetStudents = state.students.filter((student) => student.groupId === targetGroupId);
  if (!targetStudents.length) {
    showToast("当前小组暂无可评价成员。");
    return;
  }

  for (const student of targetStudents) {
    const draft = getPeerEvaluationDraft(student.id, targetGroupId);
    const missing = PEER_EVALUATION_DIMENSIONS.find((dimension) => !draft[dimension.key]);
    if (missing) {
      showToast(`请先完成 ${student.name} 的“${missing.label}”评分。`);
      return;
    }
  }

  const average = averagePeerGroupScore(targetStudents, targetGroupId);
  await submitEvaluation({
    type: "peer",
    targetGroupId,
    score: average,
    content: buildPeerEvaluationSummary(targetStudents, targetGroupId, average),
    button: dom.peerEvaluationForm.querySelector("button"),
    onSuccess: () => {
      resetPeerEvaluationDraft(targetGroupId);
      renderPeerEvaluation();
      showToast("小组互评已提交到教师看板。");
    }
  });
}

async function submitEvaluation({ type, targetGroupId, content, score, button, onSuccess }) {
  const studentId = dom.studentSelect.value;
  const student = state.students.find((item) => item.id === studentId);
  if (!student) {
    showToast("请先选择学生姓名。");
    return;
  }
  if (!content) {
    showToast("请先完成评分。");
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
        content,
        score
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

function currentStudent() {
  return state.students.find((item) => item.id === dom.studentSelect.value) || null;
}

function selectedStudentKey() {
  return `tradepilot.studentId.${selectedGroupId}`;
}

function peerTargetKey() {
  return `tradepilot.peerTarget.${selectedGroupId}`;
}

function selfDraftKey(studentId) {
  return `${selectedGroupId}:${studentId || "default"}`;
}

function peerDraftKey(studentId, targetGroupId) {
  return `${selectedGroupId}:${studentId || "reviewer"}:${targetGroupId || "target"}`;
}

function getSelfEvaluationDraft(studentId) {
  const key = selfDraftKey(studentId);
  if (!evaluationDrafts.self[key]) {
    evaluationDrafts.self[key] = Object.fromEntries(SELF_EVALUATION_DIMENSIONS.map((dimension) => [dimension.key, 0]));
  }
  return evaluationDrafts.self[key];
}

function resetSelfEvaluationDraft(studentId) {
  evaluationDrafts.self[selfDraftKey(studentId)] = Object.fromEntries(SELF_EVALUATION_DIMENSIONS.map((dimension) => [dimension.key, 0]));
}

function getPeerEvaluationDraft(studentId, targetGroupId) {
  const key = peerDraftKey(studentId, targetGroupId);
  if (!evaluationDrafts.peer[key]) {
    evaluationDrafts.peer[key] = Object.fromEntries(PEER_EVALUATION_DIMENSIONS.map((dimension) => [dimension.key, 3]));
  }
  return evaluationDrafts.peer[key];
}

function resetPeerEvaluationDraft(targetGroupId) {
  state.students
    .filter((student) => student.groupId === targetGroupId)
    .forEach((student) => {
      evaluationDrafts.peer[peerDraftKey(student.id, targetGroupId)] = Object.fromEntries(PEER_EVALUATION_DIMENSIONS.map((dimension) => [dimension.key, 3]));
    });
}

function averageDimensionScore(ratings, dimensions) {
  const total = dimensions.reduce((sum, dimension) => sum + Number(ratings[dimension.key] || 0), 0);
  return Number((total / dimensions.length).toFixed(1));
}

function averagePeerGroupScore(students, targetGroupId) {
  const allScores = students.flatMap((student) =>
    PEER_EVALUATION_DIMENSIONS.map((dimension) => Number(getPeerEvaluationDraft(student.id, targetGroupId)[dimension.key] || 0))
  );
  const total = allScores.reduce((sum, score) => sum + score, 0);
  return Number((total / allScores.length).toFixed(1));
}

function buildSelfEvaluationSummary(student, ratings, average) {
  const detail = SELF_EVALUATION_DIMENSIONS
    .map((dimension) => `${dimension.label}${ratings[dimension.key]}星`)
    .join("、");
  return `${student?.name || "学生"}自评：${detail}。综合均分${average}星，${summaryByAverage(average, "self")}。`;
}

function buildPeerEvaluationSummary(targetStudents, targetGroupId, average) {
  const targetGroupName = state.groups.find((group) => group.id === targetGroupId)?.name || "目标小组";
  const detail = targetStudents
    .map((student) => {
      const ratings = getPeerEvaluationDraft(student.id, targetGroupId);
      const row = PEER_EVALUATION_DIMENSIONS.map((dimension) => `${dimension.label}${ratings[dimension.key]}星`).join("、");
      return `${student.name}（${row}）`;
    })
    .join("；");
  return `对${targetGroupName}的互评：${detail}。综合均分${average}星，${summaryByAverage(average, "peer")}。`;
}

function summaryByAverage(average, type) {
  if (average >= 4.5) {
    return type === "self" ? "整体表现很突出，继续保持思考深度和协作稳定性" : "整体表现突出，值得重点学习";
  }
  if (average >= 3.5) {
    return type === "self" ? "整体表现较稳，还可以继续强化细节表达" : "整体表现较稳，可继续加强亮点表达";
  }
  if (average >= 2.5) {
    return type === "self" ? "基础表现已具备，建议继续补强风险分析和表达" : "基础表现较完整，仍有提升空间";
  }
  return type === "self" ? "建议继续梳理思路，提升课堂参与和风险判断" : "建议进一步增强参与度、表达和协作配合";
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
  const playfulVoice = isPlayfulVoice(preferredVoice);
  utterance.voice = preferredVoice;
  utterance.lang = "zh-CN";
  utterance.rate = playfulVoice ? 1.1 : 1.04;
  utterance.pitch = playfulVoice ? 1.85 : 1.62;
  utterance.volume = 1;
  if (!preferredVoice && !options.silent) {
    showToast("当前浏览器未发现理想卡通女声，已使用系统中文女声。");
  }
  window.speechSynthesis.speak(utterance);
}

function updateRiskResult() {
  const risk = getRiskAssessment();
  dom.riskScore.textContent = risk.complete ? risk.totalScore : "--";
  dom.riskLevelText.textContent = risk.riskLabel;
  dom.riskLevelText.className = risk.complete ? `level-badge ${risk.riskLevel}` : "level-badge";
}

function renderMixExam() {
  const attempt = getQuizAttempt("mix_exam", dom.mixExamStudentSelect?.value);
  const done = Boolean(attempt);
  dom.mixExamStatus.textContent = done ? `已提交 ${Number(attempt.score || 0).toFixed(1)}/10` : "未提交";
  dom.mixExamStatus.classList.toggle("done", done);
  dom.railPostQuiz?.classList.toggle("done", hasGroupQuizAttempt("post") || hasGroupQuizAttempt("mix_exam"));

  if (attempt?.content) {
    dom.mixExamContent.value = attempt.content;
    if (attempt.riskAssessment) {
      document.querySelectorAll(".mix-exam-risk-select").forEach((select) => {
        const value = attempt.riskAssessment?.[select.dataset.risk];
        if (value) select.value = String(value);
      });
    }
    dom.mixExamFeedback.hidden = false;
    dom.mixExamFeedback.innerHTML = renderMixedDimensionFeedback({
      content: attempt.content,
      paymentStrategy: attempt.content,
      riskLevel: attempt.riskLevel
    });
  } else {
    dom.mixExamContent.value = "";
    dom.mixExamFeedback.hidden = true;
  }
  updateMixExamRiskResult();
}

function updateMixExamRiskResult() {
  const risk = getMixExamRiskAssessment();
  dom.mixExamRiskScore.textContent = risk.totalScore;
  dom.mixExamRiskLevelText.textContent = risk.riskLabel;
  dom.mixExamRiskLevelText.className = `level-badge ${risk.riskLevel}`;
}

function getRiskAssessment() {
  const values = {};
  let complete = true;
  document.querySelectorAll(".risk-select").forEach((select) => {
    if (!select.value) complete = false;
    values[select.dataset.risk] = Number(select.value || 0);
  });
  const totalScore = Object.values(values).reduce((sum, value) => sum + value, 0);
  const riskLevel = totalScore <= 6 ? "low" : totalScore <= 12 ? "medium" : "high";
  const riskLabel = complete
    ? riskLevel === "low" ? "低风险交易" : riskLevel === "medium" ? "中风险交易" : "高风险交易"
    : "待评估";
  return { ...values, totalScore, riskLevel, riskLabel, complete };
}

function getMixExamRiskAssessment() {
  const values = {};
  document.querySelectorAll(".mix-exam-risk-select").forEach((select) => {
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

function getQuizAttempt(quizType, studentId) {
  return state.quizAttempts?.find((item) =>
    item.quizType === quizType && item.groupId === selectedGroupId && item.studentId === studentId
  );
}

function hasGroupQuizAttempt(quizType) {
  return state.quizAttempts?.some((item) => item.quizType === quizType && item.groupId === selectedGroupId);
}

function upsertSubmission(submission) {
  const index = state.submissions.findIndex((item) => item.id === submission.id);
  if (index === -1) state.submissions.push(submission);
  else state.submissions[index] = submission;
}

function upsertQuizAttempt(attempt) {
  state.quizAttempts ||= [];
  const index = state.quizAttempts.findIndex((item) => item.id === attempt.id);
  if (index === -1) state.quizAttempts.push(attempt);
  else state.quizAttempts[index] = attempt;
}

function renderFeedback(submission, scenarioCode = "") {
  if (scenarioCode === "collection_crisis" || scenarioCode === "lc_crisis") {
    return renderThreeDimensionFeedback(submission, scenarioCode);
  }
  if (scenarioCode === "mixed_payment") {
    return `
      <div class="feedback-box feedback-box-dimension feedback-box-mixed">
        ${renderMixedDimensionFeedback(submission)}
      </div>
    `;
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

function renderMixedDimensionFeedback(submission) {
  const analysis = getMixedPaymentDimensionFeedback(submission);
  return `
    <h4>点评维度 & 智能反馈</h4>
    <div class="dimension-list mixed-dimension-list">
      ${analysis.dimensions.map((item) => `
        <section class="dimension-item mixed-dimension-item">
          <div class="mixed-dimension-head">
            <h5>${escapeHtml(item.title)}</h5>
            <strong class="mixed-dimension-score">${item.score}/10</strong>
          </div>
          <div class="mixed-dimension-track">
            <div class="mixed-dimension-fill" style="width:${item.score * 10}%"></div>
          </div>
        </section>
      `).join("")}
    </div>
    <p class="mixed-feedback-footer">${icon("chat")}${submission ? "已根据风险评估与策略设计生成点评" : "完成风险评估与策略设计后获取点评"}</p>
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

function getMixedPaymentDimensionFeedback(submission) {
  if (!submission) {
    return {
      dimensions: [
        { title: "① 交易风险等级评估正确性", score: 0, text: "未写出风险等级" },
        { title: "② 混合支付策略与交易风险的匹配度", score: 0, text: "未提交支付比例与组合" },
        { title: "③ 混合支付策略多元性", score: 0, text: "无有效组合" }
      ],
      summary: "策略需改进。请先判断风险等级，再按风险等级原则设计至少两种支付组合。"
    };
  }

  const text = `${submission.content || ""} ${submission.paymentStrategy || ""}`.replace(/\s+/g, "");
  const riskLevel = submission.riskLevel || inferRiskLevelFromText(text) || "low";
  const mentionedRisk = inferRiskLevelFromText(text);
  const hasAdvance = /预付款|预付|订金|定金/.test(text);
  const hasCollection = /托收|D\/P|D\/A/i.test(text);
  const hasLc = /信用证|L\/C|LC/i.test(text);
  const methodCount = [hasAdvance, hasCollection, hasLc].filter(Boolean).length;
  const hasPercentages = /%|％|百分之|[一二三四五六七八九十两]成/.test(text);
  const has20 = /20%|20％|百分之二十|两成/.test(text);
  const has40 = /40%|40％|百分之四十|四成/.test(text);
  const has50 = /50%|50％|百分之五十|五成/.test(text);
  const has30OrMoreAdvance = /30%|30％|40%|40％|50%|50％|60%|60％|70%|70％|百分之三十|百分之四十|百分之五十|百分之六十|百分之七十|三成|四成|五成|六成|七成/.test(text);
  const has80 = /80%|80％|百分之八十|八成/.test(text);

  const riskDimension = buildMixedRiskDimension(mentionedRisk, riskLevel);
  const matchDimension = buildMixedMatchDimension({
    riskLevel,
    hasAdvance,
    hasCollection,
    hasLc,
    hasPercentages,
    has20,
    has40,
    has50,
    has80,
    has30OrMoreAdvance,
    methodCount
  });
  const diversityDimension = buildMixedDiversityDimension(methodCount, hasPercentages, hasAdvance, hasCollection, hasLc);

  const dimensions = [riskDimension, matchDimension, diversityDimension];
  const average = Number((dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length).toFixed(1));
  const summary = average >= 8
    ? `策略设计较完整。${riskLevelLabel(riskLevel)}下的支付组合与比例基本匹配。`
    : average >= 5
      ? `策略还有优化空间。请根据${riskLevelLabel(riskLevel)}原则重新核对付款工具和比例。`
      : `策略需改进。请正确判断风险等级，按${riskLevelLabel(riskLevel)}原则设计至少两种支付组合。`
  ;

  return { dimensions, summary: summary.slice(0, 120) };
}

function buildMixedRiskDimension(mentionedRisk, expectedRisk) {
  const expectedLabel = riskLevelLabel(expectedRisk);
  if (!mentionedRisk) {
    return {
      title: "① 交易风险等级评估正确性",
      score: 0,
      text: "未写出风险等级"
    };
  }

  if (mentionedRisk === expectedRisk) {
    return {
      title: "① 交易风险等级评估正确性",
      score: 10,
      text: `风险等级判断正确。你写出的${riskLevelLabel(mentionedRisk)}与系统评估一致。`
    };
  }

  return {
    title: "① 交易风险等级评估正确性",
    score: 0,
    text: `风险等级判断偏差。系统评估为${expectedLabel}`
  };
}

function buildMixedMatchDimension({ riskLevel, hasAdvance, hasCollection, hasLc, hasPercentages, has20, has40, has50, has80, has30OrMoreAdvance, methodCount }) {
  let score = 0;
  let text = "";

  if (riskLevel === "low") {
    if (hasAdvance && hasCollection && hasPercentages && has20 && has80) {
      score = 10;
      text = "匹配度较好，符合低风险原则，可采用20%预付款+80%托收。";
    } else if (hasAdvance && (hasCollection || hasLc) && hasPercentages) {
      score = 6;
      text = "有组合意识，但低风险场景应突出低成本原则，建议优化为20%预付款+80%托收。";
    } else if (methodCount >= 2) {
      score = 4;
      text = "已出现组合思路，但缺少比例，低风险原则不够清晰。";
    } else {
      score = 2;
      text = "匹配度较低，低风险场景通常应采用预付款+托收的低成本组合。";
    }
  } else if (riskLevel === "medium") {
    if (hasAdvance && hasLc && hasPercentages && (has40 || has50 || has30OrMoreAdvance)) {
      score = 10;
      text = "匹配度较好，符合中风险原则，适度提升了预付款或信用证占比。";
    } else if (hasLc && hasCollection && hasPercentages) {
      score = 6;
      text = "方向基本正确，但中风险应适度提升预付款或信用证占比，减少托收。";
    } else if (methodCount >= 2) {
      score = 2;
      text = "匹配度较低，明显偏离原则，请重新设计支付比例。中风险：适度提升预付款或信用证占比，减少托收。";
    } else {
      score = 0;
      text = "匹配度较低。明显偏离原则，请重新设计支付比例。中风险应适度提升预付款或信用证占比。";
    }
  } else {
    if (hasAdvance && hasLc && hasPercentages && has30OrMoreAdvance) {
      score = 10;
      text = "匹配度较好，符合高风险原则，预付款和信用证保障较充分。";
    } else if (hasAdvance && hasLc) {
      score = 6;
      text = "方向基本正确，但高风险应写清较高预付款比例，并减少托收依赖。";
    } else if (methodCount >= 2) {
      score = 2;
      text = "匹配度较低，高风险交易不宜依赖托收，建议提高预付款和信用证比重。";
    } else {
      score = 0;
      text = "匹配度很低。高风险交易应优先用高比例预付款配合信用证，不建议单一支付方式。";
    }
  }

  return {
    title: "② 混合支付策略与交易风险的匹配度",
    score,
    text
  };
}

function buildMixedDiversityDimension(methodCount, hasPercentages, hasAdvance, hasCollection, hasLc) {
  const methods = [
    hasAdvance ? "预付款" : "",
    hasLc ? "信用证" : "",
    hasCollection ? "托收" : ""
  ].filter(Boolean);

  if (methodCount >= 3 && hasPercentages) {
    return {
      title: "③ 混合支付策略多元性",
      score: 10,
      text: `支付工具较丰富，已组合${methods.join("、")}，且写出了比例。`
    };
  }
  if (methodCount === 2 && hasPercentages) {
    return {
      title: "③ 混合支付策略多元性",
      score: 8,
      text: `已形成双工具组合（${methods.join(" + ")}），多元性较好。`
    };
  }
  if (methodCount === 2) {
    return {
      title: "③ 混合支付策略多元性",
      score: 6,
      text: `支付工具已有组合（${methods.join(" + ")}），但还缺少清晰比例。`
    };
  }
  if (methodCount === 1) {
    return {
      title: "③ 混合支付策略多元性",
      score: 2,
      text: `目前只出现${methods[0]}，还没有形成真正的混合支付组合。`
    };
  }

  return {
    title: "③ 混合支付策略多元性",
    score: 0,
    text: "未识别到有效组合。建议至少写出两种支付工具及对应比例。"
  };
}

function inferRiskLevelFromText(text) {
  if (/高风险/.test(text)) return "high";
  if (/中风险/.test(text)) return "medium";
  if (/低风险/.test(text)) return "low";
  return "";
}

function riskLevelLabel(level) {
  if (level === "high") return "高风险";
  if (level === "medium") return "中风险";
  return "低风险";
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
    /Xiaoyi/i,
    /Yaoyao/i,
    /Xiaoxiao/i,
    /Xiaochen/i,
    /Meijia/i,
    /Tingting/i,
    /SiuMai/i,
    /HiuMaan/i,
    /Airi/i,
    /Nanami/i,
    /Girl/i,
    /Cute/i,
    /Female/i,
    /Child/i,
    /少女|小艺|晓晓|晓辰|瑶瑶|美嘉|婷婷/i,
    /Xiaoxiao/i,
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
    voices.find((voice) => /zh/i.test(voice.lang) && isPlayfulVoice(voice)) ||
    voices.find((voice) => /zh/i.test(voice.lang) && /(Xiao|Yao|Ting|Mei|Hui|Female|Girl)/i.test(voice.name)) ||
    voices.find((voice) => /zh/i.test(voice.lang) && /female/i.test(`${voice.name} ${voice.voiceURI || ""}`)) ||
    voices.find((voice) => /zh/i.test(voice.lang)) ||
    null
  );
}

function isPlayfulVoice(voice) {
  const signature = `${voice?.name || ""} ${voice?.voiceURI || ""}`;
  return /Xiaoyi|Yaoyao|Xiaoxiao|Xiaochen|Meijia|Tingting|Girl|Cute|Child|Female|少女|小艺|晓晓|晓辰|瑶瑶|美嘉|婷婷/i.test(signature);
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
