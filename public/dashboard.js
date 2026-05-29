const dom = {
  refreshBtn: document.querySelector("#refreshBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  totalGroups: document.querySelector("#totalGroups"),
  totalSubmissions: document.querySelector("#totalSubmissions"),
  totalReflections: document.querySelector("#totalReflections"),
  totalEvaluations: document.querySelector("#totalEvaluations"),
  totalQuizAttempts: document.querySelector("#totalQuizAttempts"),
  aiFallback: document.querySelector("#aiFallback"),
  scenarioStats: document.querySelector("#scenarioStats"),
  quizStats: document.querySelector("#quizStats"),
  quizDemoNote: document.querySelector("#quizDemoNote"),
  quizQuestionChart: document.querySelector("#quizQuestionChart"),
  quizGroupChart: document.querySelector("#quizGroupChart"),
  riskBars: document.querySelector("#riskBars"),
  groupProgress: document.querySelector("#groupProgress"),
  wordCloud: document.querySelector("#wordCloud"),
  recentSubmissions: document.querySelector("#recentSubmissions"),
  submissionTabs: document.querySelectorAll("[data-scenario-filter]"),
  recentQuizAttempts: document.querySelector("#recentQuizAttempts"),
  evaluationBoard: document.querySelector("#evaluationBoard"),
  evaluationSummary: document.querySelector("#evaluationSummary"),
  evaluationList: document.querySelector("#evaluationList"),
  reflectionList: document.querySelector("#reflectionList"),
  toast: document.querySelector("#toast")
};

const riskLabels = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
};

const SELF_EVALUATION_DIMENSIONS = [
  "学习态度",
  "协作贡献",
  "风险应对能力",
  "素养体悟",
  "商业思维领悟"
];

const PEER_EVALUATION_DIMENSIONS = [
  "参与贡献度",
  "沟通表达",
  "团队协作"
];

let selectedSubmissionScenario = "collection_crisis";

const DEMO_QUIZ_STATS = {
  pre: { submittedRate: 0.78, avgScore: 6.8 },
  post: { submittedRate: 0.84, avgScore: 7.5 },
  mix_exam: { submittedRate: 0.76, avgScore: 8.1 }
};

const DEMO_QUESTION_AVERAGES = {
  pre: [0.62, 0.58, 0.71, 0.65, 0.76, 0.69, 0.54, 0.6, 0.73, 0.67],
  post: [0.78, 0.72, 0.84, 0.8, 0.86, 0.75, 0.69, 0.74, 0.82, 0.79]
};

const DEMO_GROUP_AVERAGES = {
  pre: [6.8, 6.2, 7.1, 6.5, 7.4, 6.9, 7.0],
  post: [7.6, 7.1, 8.0, 7.3, 8.2, 7.8, 7.9],
  mix_exam: [8.1, 7.6, 8.4, 7.9, 8.6, 8.0, 8.3]
};

loadDashboard();
dom.refreshBtn.addEventListener("click", loadDashboard);
dom.exportBtn.addEventListener("click", exportData);
dom.resetBtn.addEventListener("click", resetData);
dom.submissionTabs.forEach((button) => {
  button.addEventListener("click", () => {
    selectedSubmissionScenario = button.dataset.scenarioFilter || "collection_crisis";
    renderSubmissionTabs();
    loadDashboard();
  });
});
setInterval(loadDashboard, 5000);
window.addEventListener("resize", debounce(loadDashboard, 240));

async function loadDashboard() {
  try {
    const data = await api("/api/dashboard");
    renderDashboard(data);
  } catch (error) {
    showToast(error.message);
  }
}

function renderDashboard(data) {
  const dashboard = normalizeDashboard(data);

  dom.totalGroups.textContent = dashboard.totalGroups;
  dom.totalSubmissions.textContent = dashboard.totalSubmissions;
  dom.totalReflections.textContent = dashboard.totalReflections;
  dom.totalEvaluations.textContent = dashboard.totalEvaluations;
  dom.totalQuizAttempts.textContent = dashboard.totalQuizAttempts;
  dom.aiFallback.textContent = dashboard.aiHealth.fallback;
  renderScenarioStats(dashboard.scenarioStats);
  const quizDisplay = buildQuizDisplayData(dashboard);
  renderQuizStats(quizDisplay.stats);
  renderQuizCharts(quizDisplay.questionStats, quizDisplay.groupStats);
  renderQuizDemoNote(quizDisplay.usesDemo);
  renderRiskBars(dashboard.riskDistribution);
  renderGroupProgress(dashboard.groupProgress);
  renderWordCloud(dashboard.wordCloud);
  renderRecentSubmissions(dashboard.recentSubmissions);
  renderRecentQuizAttempts(dashboard.recentQuizAttempts);
  renderEvaluationBoard(dashboard.groupProgress);
  renderEvaluations(dashboard.evaluations, dashboard.evaluationSummary);
  renderReflections(dashboard.reflections);
}

function buildQuizDisplayData(dashboard) {
  const stats = dashboard.quizStats.map((item) => applyDemoQuizStat(item));
  const questionStats = buildDisplayQuestionStats(dashboard.quizQuestionStats);
  const groupStats = buildDisplayGroupStats(dashboard.quizGroupStats);
  return {
    stats,
    questionStats,
    groupStats,
    usesDemo: stats.some((item) => item.isDemo) ||
      questionStats.some((item) => item.preDemo || item.postDemo) ||
      groupStats.some((item) => item.preDemo || item.postDemo || item.mixDemo)
  };
}

function applyDemoQuizStat(item) {
  if (Number(item.submittedStudents || 0) > 0) return { ...item, isDemo: false };

  const demo = DEMO_QUIZ_STATS[item.type] || { submittedRate: 0.75, avgScore: 7.0 };
  const totalStudents = Number(item.totalStudents || 0);
  const submittedStudents = totalStudents ? Math.max(1, Math.round(totalStudents * demo.submittedRate)) : 0;
  return {
    ...item,
    submittedStudents,
    avgScore: demo.avgScore,
    isDemo: true
  };
}

function buildDisplayQuestionStats(stats) {
  const rows = stats.length ? stats : Array.from({ length: 10 }, (_, index) => ({ questionNo: index + 1 }));
  return rows.map((item, index) => {
    const hasPre = Number(item.preCount || 0) > 0;
    const hasPost = Number(item.postCount || 0) > 0;
    return {
      ...item,
      preAvg: hasPre ? Number(item.preAvg || 0) : demoQuestionAverage("pre", index),
      preCount: hasPre ? item.preCount : 1,
      preDemo: !hasPre,
      postAvg: hasPost ? Number(item.postAvg || 0) : demoQuestionAverage("post", index),
      postCount: hasPost ? item.postCount : 1,
      postDemo: !hasPost
    };
  });
}

function demoQuestionAverage(type, index) {
  const values = DEMO_QUESTION_AVERAGES[type] || [];
  return Number((values[index % values.length] || 0.7).toFixed(2));
}

function buildDisplayGroupStats(stats) {
  return stats.map((item, index) => {
    const hasPre = Number(item.preCount || 0) > 0;
    const hasPost = Number(item.postCount || 0) > 0;
    const hasMix = Number(item.mixCount || 0) > 0;
    return {
      ...item,
      preAvg: hasPre ? Number(item.preAvg || 0) : demoGroupAverage("pre", index),
      preCount: hasPre ? item.preCount : 1,
      preDemo: !hasPre,
      postAvg: hasPost ? Number(item.postAvg || 0) : demoGroupAverage("post", index),
      postCount: hasPost ? item.postCount : 1,
      postDemo: !hasPost,
      mixAvg: hasMix ? Number(item.mixAvg || 0) : demoGroupAverage("mix_exam", index),
      mixCount: hasMix ? item.mixCount : 1,
      mixDemo: !hasMix
    };
  });
}

function demoGroupAverage(type, index) {
  const values = DEMO_GROUP_AVERAGES[type] || [];
  return Number((values[index % values.length] || 7.5).toFixed(1));
}

function normalizeDashboard(data = {}) {
  return {
    totalGroups: Number(data.totalGroups || 0),
    totalSubmissions: Number(data.totalSubmissions || 0),
    totalReflections: Number(data.totalReflections || 0),
    totalEvaluations: Number(data.totalEvaluations || 0),
    totalQuizAttempts: Number(data.totalQuizAttempts || 0),
    aiHealth: { fallback: 0, ...(data.aiHealth || {}) },
    scenarioStats: Array.isArray(data.scenarioStats) ? data.scenarioStats : [],
    quizStats: Array.isArray(data.quizStats) ? data.quizStats : [],
    quizQuestionStats: Array.isArray(data.quizQuestionStats) ? data.quizQuestionStats : [],
    quizGroupStats: Array.isArray(data.quizGroupStats) ? data.quizGroupStats : [],
    riskDistribution: Array.isArray(data.riskDistribution) ? data.riskDistribution : [],
    groupProgress: Array.isArray(data.groupProgress) ? data.groupProgress : [],
    wordCloud: Array.isArray(data.wordCloud) ? data.wordCloud : [],
    recentSubmissions: Array.isArray(data.recentSubmissions) ? data.recentSubmissions : [],
    recentQuizAttempts: Array.isArray(data.recentQuizAttempts) ? data.recentQuizAttempts : [],
    evaluations: Array.isArray(data.evaluations) ? data.evaluations : [],
    evaluationSummary: { selfCount: 0, peerCount: 0, selfAvg: null, peerAvg: null, ...(data.evaluationSummary || {}) },
    reflections: Array.isArray(data.reflections) ? data.reflections : []
  };
}

function renderScenarioStats(stats) {
  if (!stats.length) {
    dom.scenarioStats.innerHTML = `<div class="submission-item"><p>暂无任务统计。</p></div>`;
    return;
  }

  dom.scenarioStats.innerHTML = stats
    .map((item) => {
      const percent = item.totalGroups ? Math.round((item.submittedGroups / item.totalGroups) * 100) : 0;
      return `
        <div class="stat-row">
          <strong>${escapeHtml(item.title)}</strong>
          <div class="progress-track">
            <div class="progress-fill" style="width:${percent}%"></div>
          </div>
          <span>${item.submittedGroups}/${item.totalGroups}</span>
        </div>
      `;
    })
    .join("");
}

function renderQuizStats(stats) {
  if (!stats.length) {
    dom.quizStats.innerHTML = `<div class="submission-item"><p>暂无小测统计。</p></div>`;
    return;
  }

  dom.quizStats.innerHTML = stats
    .map((item) => {
      const percent = item.totalStudents ? Math.round((item.submittedStudents / item.totalStudents) * 100) : 0;
      return `
        <div class="stat-row">
          <strong>${escapeHtml(item.title)}${item.isDemo ? `<em class="stat-demo-badge">演示</em>` : ""}</strong>
          <div class="progress-track">
            <div class="progress-fill" style="width:${percent}%"></div>
          </div>
          <span>${item.submittedStudents}/${item.totalStudents} · 均分 ${Number(item.avgScore || 0).toFixed(1)}</span>
        </div>
      `;
    })
    .join("");
}

function renderQuizDemoNote(usesDemo) {
  if (!dom.quizDemoNote) return;
  dom.quizDemoNote.hidden = !usesDemo;
}

function renderQuizCharts(questionStats, groupStats) {
  renderQuizQuestionChart(questionStats);
  renderQuizGroupChart(groupStats);
}

function renderQuizQuestionChart(stats) {
  if (!stats.some((item) => Number(item.preCount || 0) || Number(item.postCount || 0))) {
    dom.quizQuestionChart.innerHTML = `<div class="chart-empty">等待学生完成课前/课后小测</div>`;
    return;
  }

  const labels = stats.map((item) => `Q${item.questionNo}`);
  dom.quizQuestionChart.innerHTML = renderGroupedBarChart({
    labels,
    maxValue: 1,
    tickCount: 5,
    valueSuffix: "",
    series: [
      { name: stats.some((item) => item.preDemo) ? "课前（含演示）" : "课前", color: "#245f88", values: stats.map((item) => Number(item.preAvg || 0)) },
      { name: stats.some((item) => item.postDemo) ? "课后（含演示）" : "课后", color: "#f59f32", values: stats.map((item) => Number(item.postAvg || 0)) }
    ]
  });
}

function renderQuizGroupChart(stats) {
  if (!stats.some((item) => Number(item.preCount || 0) || Number(item.postCount || 0) || Number(item.mixCount || 0))) {
    dom.quizGroupChart.innerHTML = `<div class="chart-empty">等待各小组提交小测数据</div>`;
    return;
  }

  const labels = stats.map((item) => item.groupName);
  dom.quizGroupChart.innerHTML = renderLineChart({
    labels,
    maxValue: 10,
    tickCount: 5,
    series: [
      { name: stats.some((item) => item.preDemo) ? "课前（含演示）" : "课前", color: "#245f88", values: stats.map((item) => Number(item.preAvg || 0)) },
      { name: stats.some((item) => item.postDemo) ? "课后（含演示）" : "课后", color: "#f59f32", values: stats.map((item) => Number(item.postAvg || 0)) },
      { name: stats.some((item) => item.mixDemo) ? "策略（含演示）" : "策略", color: "#36b6d4", values: stats.map((item) => Number(item.mixAvg || 0)) }
    ]
  });
}

function renderGroupedBarChart({ labels, series, maxValue, tickCount }) {
  const width = 760;
  const height = 300;
  const margin = { top: 28, right: 24, bottom: 58, left: 48 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const groupWidth = chartWidth / Math.max(labels.length, 1);
  const barWidth = Math.min(18, (groupWidth - 18) / Math.max(series.length, 1));
  const y = (value) => margin.top + chartHeight - (Math.max(0, Math.min(maxValue, value)) / maxValue) * chartHeight;

  return `
    ${renderChartLegend(series)}
    <svg class="dashboard-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="每题均分统计图">
      ${renderYAxis({ width, margin, chartHeight, maxValue, tickCount })}
      ${labels.map((label, index) => {
        const x = margin.left + index * groupWidth + groupWidth / 2;
        return `<text class="chart-x-label" x="${x}" y="${height - 24}" text-anchor="middle">${escapeHtml(label)}</text>`;
      }).join("")}
      ${series.map((serie, serieIndex) =>
        serie.values.map((value, index) => {
          const center = margin.left + index * groupWidth + groupWidth / 2;
          const x = center - ((series.length * barWidth + (series.length - 1) * 5) / 2) + serieIndex * (barWidth + 5);
          const barY = y(value);
          const barHeight = margin.top + chartHeight - barY;
          return `<rect class="chart-bar" x="${x}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="5" fill="${serie.color}"><title>${escapeHtml(serie.name)} ${escapeHtml(labels[index])}: ${Number(value || 0).toFixed(2)}</title></rect>`;
        }).join("")
      ).join("")}
    </svg>
  `;
}

function renderLineChart({ labels, series, maxValue, tickCount }) {
  const width = 760;
  const height = 310;
  const margin = { top: 30, right: 30, bottom: 70, left: 48 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const x = (index) => margin.left + (labels.length <= 1 ? chartWidth / 2 : (index / (labels.length - 1)) * chartWidth);
  const y = (value) => margin.top + chartHeight - (Math.max(0, Math.min(maxValue, value)) / maxValue) * chartHeight;

  return `
    ${renderChartLegend(series)}
    <svg class="dashboard-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="各组平均分统计图">
      ${renderYAxis({ width, margin, chartHeight, maxValue, tickCount })}
      ${labels.map((label, index) => `
        <text class="chart-x-label chart-x-label-group" x="${x(index)}" y="${height - 38}" text-anchor="middle">${escapeHtml(label)}</text>
      `).join("")}
      ${series.map((serie) => {
        const points = serie.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
        return `
          <polyline class="chart-line" points="${points}" fill="none" stroke="${serie.color}" />
          ${serie.values.map((value, index) => `
            <circle class="chart-point" cx="${x(index)}" cy="${y(value)}" r="5" fill="${serie.color}">
              <title>${escapeHtml(serie.name)} ${escapeHtml(labels[index])}: ${Number(value || 0).toFixed(1)}分</title>
            </circle>
            <text class="chart-point-label" x="${x(index)}" y="${y(value) - 10}" text-anchor="middle">${Number(value || 0).toFixed(1)}</text>
          `).join("")}
        `;
      }).join("")}
    </svg>
  `;
}

function renderChartLegend(series) {
  return `
    <div class="chart-legend">
      ${series.map((item) => `
        <span><i style="background:${item.color}"></i>${escapeHtml(item.name)}</span>
      `).join("")}
    </div>
  `;
}

function renderYAxis({ width, margin, chartHeight, maxValue, tickCount }) {
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => Number(((maxValue / tickCount) * index).toFixed(2)));
  return `
    <line class="chart-axis" x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" />
    <line class="chart-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" />
    ${ticks.map((tick) => {
      const y = margin.top + chartHeight - (tick / maxValue) * chartHeight;
      return `
        <line class="chart-grid-line" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" />
        <text class="chart-y-label" x="${margin.left - 12}" y="${y + 4}" text-anchor="end">${tick % 1 === 0 ? tick : tick.toFixed(1)}</text>
      `;
    }).join("")}
  `;
}

function renderRiskBars(distribution) {
  if (!distribution.length) {
    dom.riskBars.innerHTML = `<div class="submission-item"><p>暂无风险分布。</p></div>`;
    return;
  }

  const max = Math.max(1, ...distribution.map((item) => item.count));
  dom.riskBars.innerHTML = distribution
    .map((item) => {
      const width = Math.round((item.count / max) * 100);
      return `
        <div class="risk-bar-row">
          <strong>${riskLabels[item.level] || item.level}</strong>
          <div class="risk-track">
            <div class="risk-fill" style="width:${width}%"></div>
          </div>
          <span>${item.count}</span>
        </div>
      `;
    })
    .join("");
}

function renderGroupProgress(groups) {
  if (!groups.length) {
    dom.groupProgress.innerHTML = `<tr><td colspan="9">暂无小组数据。</td></tr>`;
    return;
  }

  dom.groupProgress.innerHTML = groups
    .map((group) => `
      <tr>
        <td><strong>${escapeHtml(group.groupName)}</strong></td>
        <td>${renderCheck(group.collection)}</td>
        <td>${renderCheck(group.lc)}</td>
        <td>${renderCheck(group.mixed)}</td>
        <td>${renderCount(group.preQuizCount)}</td>
        <td>${renderCount(group.postQuizCount)}</td>
        <td>${renderCount(group.mixExamCount)}</td>
        <td>${renderEvaluationCell(group.selfAvg, group.selfCount)}</td>
        <td>${renderEvaluationCell(group.peerAvg, group.peerCount)}</td>
      </tr>
    `)
    .join("");
}

function renderCount(count) {
  return Number(count || 0) ? `${Number(count)}人` : "-";
}

function renderEvaluationCell(avg, count) {
  return count ? `${Number(avg || 0).toFixed(1)}星 · ${count}条` : "-";
}

function renderEvaluationBoard(groups) {
  if (!groups.length) {
    dom.evaluationBoard.innerHTML = `<div class="reflection-item"><p>暂无星级数据。</p></div>`;
    return;
  }

  dom.evaluationBoard.innerHTML = groups
    .map((group) => `
      <article class="evaluation-board-card">
        <strong>${escapeHtml(group.groupName)}</strong>
        ${renderStarRow("自评", group.selfAvg, group.selfCount)}
        ${renderStarRow("互评", group.peerAvg, group.peerCount)}
      </article>
    `)
    .join("");
}

function renderStarRow(label, avg, count) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(avg || 0))));
  const stars = Array.from({ length: 5 }, (_, index) => `
    <span class="evaluation-board-star ${index < filled ? "active" : ""}">★</span>
  `).join("");
  return `
    <div class="evaluation-board-row">
      <span class="evaluation-board-label">${label}</span>
      <div class="evaluation-board-stars">${stars}</div>
      <span class="evaluation-board-meta">${count || 0}条</span>
    </div>
  `;
}

function renderCheck(done) {
  return `<span class="check ${done ? "ok" : ""}">${done ? "已交" : "待交"}</span>`;
}

function renderWordCloud(words) {
  if (!words.length) {
    dom.wordCloud.innerHTML = `<div class="empty-cloud">等待学生提交课堂收获</div>`;
    return;
  }

  const max = Math.max(...words.map((word) => word.weight));
  const canvas = document.createElement("canvas");
  const width = Math.max(dom.wordCloud.clientWidth, 320);
  const height = Math.max(dom.wordCloud.clientHeight, 300);
  const dpr = window.devicePixelRatio || 1;
  const palette = ["#15567f", "#1f75a8", "#35b6d4", "#7aa51d", "#d88a14", "#536fa8", "#d9534f"];

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const boxes = [];
  words.slice(0, 48).forEach((word, index) => {
    const size = 17 + Math.round((word.weight / max) * 39);
    ctx.font = `900 ${size}px "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
    const textWidth = ctx.measureText(word.term).width;
    const box = placeWord(index, textWidth + 14, size + 12, width, height, boxes);
    if (!box) return;

    boxes.push(box);
    ctx.fillStyle = palette[index % palette.length];
    ctx.font = `900 ${size}px "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText(word.term, box.x + box.w / 2, box.y + box.h / 2);
  });

  dom.wordCloud.innerHTML = "";
  dom.wordCloud.appendChild(canvas);
}

function placeWord(index, wordWidth, wordHeight, width, height, boxes) {
  const centerX = width / 2;
  const centerY = height / 2;

  for (let step = 0; step < 900; step += 1) {
    const angle = step * 0.38 + index * 0.82;
    const radius = 3 + step * 0.58;
    const x = centerX + Math.cos(angle) * radius - wordWidth / 2;
    const y = centerY + Math.sin(angle) * radius - wordHeight / 2;
    const box = { x, y, w: wordWidth, h: wordHeight };

    if (x < 8 || y < 8 || x + wordWidth > width - 8 || y + wordHeight > height - 8) {
      continue;
    }
    if (!boxes.some((placed) => intersects(box, placed))) return box;
  }

  return null;
}

function intersects(a, b) {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}

function renderRecentSubmissions(items) {
  renderSubmissionTabs();
  const filteredItems = items.filter((item) => item.scenarioCode === selectedSubmissionScenario);
  if (!filteredItems.length) {
    dom.recentSubmissions.innerHTML = `<div class="submission-item"><p>暂无${escapeHtml(scenarioFilterLabel(selectedSubmissionScenario))}提交。</p></div>`;
    return;
  }

  dom.recentSubmissions.innerHTML = filteredItems
    .map((item) => `
      <article class="submission-item">
        <strong>${escapeHtml(item.groupName)} · ${escapeHtml(item.scenarioTitle)}</strong>
        <p>${escapeHtml(truncate(item.content, 108))}</p>
        ${renderTeacherMixedDimensions(item)}
      </article>
    `)
    .join("");
}

function renderSubmissionTabs() {
  dom.submissionTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.scenarioFilter === selectedSubmissionScenario);
  });
}

function scenarioFilterLabel(code) {
  if (code === "collection_crisis") return "托收方案";
  if (code === "lc_crisis") return "信用证方案";
  if (code === "mixed_payment") return "混合支付方案";
  return "方案";
}

function renderRecentQuizAttempts(items) {
  if (!items.length) {
    dom.recentQuizAttempts.innerHTML = `<div class="submission-item"><p>暂无小测记录。</p></div>`;
    return;
  }

  dom.recentQuizAttempts.innerHTML = items
    .map((item) => `
      <article class="submission-item">
        <strong>${escapeHtml(item.groupName)} · ${escapeHtml(item.studentName)} · ${escapeHtml(quizTypeLabel(item.quizType))}</strong>
        <p>${renderQuizAttemptSummary(item)}</p>
      </article>
    `)
    .join("");
}

function renderQuizAttemptSummary(item) {
  if (item.quizType === "mix_exam") {
    return escapeHtml(`${riskLabels[item.riskLevel] || "未判定"} · ${truncate(item.content || item.feedback || "已提交策略", 88)}`);
  }
  return escapeHtml(`得分 ${Number(item.score || 0)}/${Number(item.total || 0)}`);
}

function quizTypeLabel(type) {
  if (type === "pre") return "课前小测";
  if (type === "post") return "课后小测";
  return "课后策略";
}

function renderTeacherMixedDimensions(item) {
  if (item.scenarioCode !== "mixed_payment") return "";

  const analysis = getMixedPaymentDimensionFeedback(item);
  return `
    <div class="teacher-mixed-dimensions" aria-label="混合支付点评维度">
      ${analysis.dimensions.map((dimension) => `
        <section class="teacher-mixed-dimension">
          <div class="teacher-mixed-dimension-head">
            <span>${escapeHtml(dimension.title)}</span>
            <strong>${Number(dimension.score || 0)}/10</strong>
          </div>
          <div class="teacher-mixed-track">
            <div class="teacher-mixed-fill" style="width:${Number(dimension.score || 0) * 10}%"></div>
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function getMixedPaymentDimensionFeedback(submission) {
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

  return {
    dimensions: [
      buildMixedRiskDimension(mentionedRisk, riskLevel),
      buildMixedMatchDimension({
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
      }),
      buildMixedDiversityDimension(methodCount, hasPercentages)
    ]
  };
}

function buildMixedRiskDimension(mentionedRisk, expectedRisk) {
  if (!mentionedRisk) {
    return { title: "① 交易风险等级评估正确性", score: 0 };
  }
  return {
    title: "① 交易风险等级评估正确性",
    score: mentionedRisk === expectedRisk ? 10 : 0
  };
}

function buildMixedMatchDimension({ riskLevel, hasAdvance, hasCollection, hasLc, hasPercentages, has20, has40, has50, has80, has30OrMoreAdvance, methodCount }) {
  if (riskLevel === "low") {
    if (hasAdvance && hasCollection && hasPercentages && has20 && has80) return { title: "② 混合支付策略与交易风险的匹配度", score: 10 };
    if (hasAdvance && (hasCollection || hasLc) && hasPercentages) return { title: "② 混合支付策略与交易风险的匹配度", score: 6 };
    if (methodCount >= 2) return { title: "② 混合支付策略与交易风险的匹配度", score: 4 };
    return { title: "② 混合支付策略与交易风险的匹配度", score: 2 };
  }

  if (riskLevel === "medium") {
    if (hasAdvance && hasLc && hasPercentages && (has40 || has50 || has30OrMoreAdvance)) return { title: "② 混合支付策略与交易风险的匹配度", score: 10 };
    if (hasLc && hasCollection && hasPercentages) return { title: "② 混合支付策略与交易风险的匹配度", score: 6 };
    if (methodCount >= 2) return { title: "② 混合支付策略与交易风险的匹配度", score: 2 };
    return { title: "② 混合支付策略与交易风险的匹配度", score: 0 };
  }

  if (hasAdvance && hasLc && hasPercentages && has30OrMoreAdvance) return { title: "② 混合支付策略与交易风险的匹配度", score: 10 };
  if (hasAdvance && hasLc) return { title: "② 混合支付策略与交易风险的匹配度", score: 6 };
  if (methodCount >= 2) return { title: "② 混合支付策略与交易风险的匹配度", score: 2 };
  return { title: "② 混合支付策略与交易风险的匹配度", score: 0 };
}

function buildMixedDiversityDimension(methodCount, hasPercentages) {
  if (methodCount >= 3 && hasPercentages) return { title: "③ 混合支付策略多元性", score: 10 };
  if (methodCount === 2 && hasPercentages) return { title: "③ 混合支付策略多元性", score: 8 };
  if (methodCount === 2) return { title: "③ 混合支付策略多元性", score: 6 };
  if (methodCount === 1) return { title: "③ 混合支付策略多元性", score: 2 };
  return { title: "③ 混合支付策略多元性", score: 0 };
}

function inferRiskLevelFromText(text) {
  if (/高风险/.test(text)) return "high";
  if (/中风险/.test(text)) return "medium";
  if (/低风险/.test(text)) return "low";
  return "";
}

function renderEvaluations(items, summary) {
  const safeSummary = { selfCount: 0, peerCount: 0, selfAvg: null, peerAvg: null, ...(summary || {}) };
  const selfItems = items.filter((item) => item.type === "self");

  dom.evaluationSummary.innerHTML = `
    <span>自评 ${safeSummary.selfCount || 0} 条</span>
    <span>互评 ${safeSummary.peerCount || 0} 条</span>
  `;

  if (!items.length) {
    dom.evaluationList.innerHTML = `
      <section class="teacher-evaluation-section">
        <div class="teacher-evaluation-head">
          <strong>自评明细</strong>
          <span>0 条</span>
        </div>
        <div class="teacher-evaluation-cards">
          <div class="reflection-item"><p>暂无自评记录。</p></div>
        </div>
      </section>
    `;
    return;
  }

  dom.evaluationList.innerHTML = `
    <section class="teacher-evaluation-section">
      <div class="teacher-evaluation-head">
        <strong>自评明细</strong>
        <span>${selfItems.length} 条</span>
      </div>
      <div class="teacher-evaluation-cards">
        ${selfItems.length ? selfItems.map(renderSelfEvaluationCard).join("") : `<div class="reflection-item"><p>暂无自评记录。</p></div>`}
      </div>
    </section>
  `;
}

function renderSelfEvaluationCard(item) {
  const parsed = parseSelfEvaluationContent(item.content);
  return `
    <article class="reflection-item teacher-evaluation-card">
      <div class="teacher-evaluation-card-head">
        <div>
          <strong>${escapeHtml(item.studentName)}</strong>
          <p>${escapeHtml(item.groupName)} · 自评均分 ${Number(item.score || 0).toFixed(1)} 星</p>
        </div>
      </div>
      ${parsed.dimensions.length ? `
        <div class="teacher-score-grid">
          ${parsed.dimensions.map((dimension) => `
            <div class="teacher-score-row">
              <span>${escapeHtml(dimension.label)}</span>
              <div class="teacher-score-stars">${renderScoreStars(dimension.score)}</div>
              <strong>${dimension.score}星</strong>
            </div>
          `).join("")}
        </div>
      ` : `<p>${escapeHtml(item.content)}</p>`}
    </article>
  `;
}

function renderPeerEvaluationCard(item) {
  const parsed = parsePeerEvaluationContent(item.content);
  return `
    <article class="reflection-item teacher-evaluation-card">
      <div class="teacher-evaluation-card-head">
        <div>
          <strong>${escapeHtml(item.targetGroupName || "目标小组")}</strong>
          <p>${escapeHtml(item.groupName)} 发起互评 · ${escapeHtml(item.studentName)}提交 · 互评均分 ${Number(item.score || 0).toFixed(1)} 星</p>
        </div>
      </div>
      ${parsed.members.length ? `
        <div class="teacher-peer-members">
          ${parsed.members.map((member) => `
            <section class="teacher-peer-member">
              <strong>${escapeHtml(member.name)}</strong>
              <div class="teacher-score-grid compact">
                ${member.dimensions.map((dimension) => `
                  <div class="teacher-score-row">
                    <span>${escapeHtml(dimension.label)}</span>
                    <div class="teacher-score-stars">${renderScoreStars(dimension.score)}</div>
                    <strong>${dimension.score}星</strong>
                  </div>
                `).join("")}
              </div>
            </section>
          `).join("")}
        </div>
      ` : `<p>${escapeHtml(item.content)}</p>`}
    </article>
  `;
}

function parseSelfEvaluationContent(content) {
  const text = String(content || "");
  const dimensions = SELF_EVALUATION_DIMENSIONS
    .map((label) => {
      const match = text.match(new RegExp(`${escapeRegExp(label)}\\s*(\\d+(?:\\.\\d+)?)星`));
      return match ? { label, score: Number(match[1]) } : null;
    })
    .filter(Boolean);
  return { dimensions };
}

function parsePeerEvaluationContent(content) {
  const text = String(content || "");
  const detailText = text
    .replace(/^对.+?的互评[:：]/, "")
    .replace(/。综合均分[\s\S]*$/, "")
    .trim();

  const members = detailText
    .split(/[；;]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const match = chunk.match(/^(.+?)[（(](.+?)[）)]$/);
      if (!match) return null;
      const [, name, rawDimensions] = match;
      const dimensions = PEER_EVALUATION_DIMENSIONS
        .map((label) => {
          const scoreMatch = rawDimensions.match(new RegExp(`${escapeRegExp(label)}\\s*(\\d+(?:\\.\\d+)?)星`));
          return scoreMatch ? { label, score: Number(scoreMatch[1]) } : null;
        })
        .filter(Boolean);
      return dimensions.length ? { name, dimensions } : null;
    })
    .filter(Boolean);

  return { members };
}

function renderScoreStars(score) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(score || 0))));
  return Array.from({ length: 5 }, (_, index) => `
    <span class="teacher-score-star ${index < rounded ? "active" : ""}">★</span>
  `).join("");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderReflections(items) {
  if (!items.length) {
    dom.reflectionList.innerHTML = `<div class="reflection-item"><p>暂无课堂收获。</p></div>`;
    return;
  }

  dom.reflectionList.innerHTML = items
    .map((item) => `
      <article class="reflection-item">
        <strong>${escapeHtml(item.studentName)} · ${escapeHtml(groupName(item.groupId))}</strong>
        <p>${escapeHtml(item.content)}</p>
      </article>
    `)
    .join("");
}

function groupName(groupId) {
  return groupId ? groupId.replace("g", "第") + "组" : "未知小组";
}

async function api(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败，请稍后重试。");
  return data;
}

async function exportData() {
  try {
    const data = await api("/api/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tradepilot-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("数据已导出。");
  } catch (error) {
    showToast(error.message);
  }
}

async function resetData() {
  const confirmed = window.confirm("确定清空本节课所有提交、AI记录和课堂收获吗？该操作不可恢复。");
  if (!confirmed) return;

  try {
    const response = await fetch("/api/admin/reset", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "清空失败，请稍后重试。");
    showToast("课堂数据已清空。");
    await loadDashboard();
  } catch (error) {
    showToast(error.message);
  }
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => dom.toast.classList.remove("show"), 2400);
}

function truncate(text, max) {
  return Array.from(String(text || "")).slice(0, max).join("") + (String(text || "").length > max ? "..." : "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debounce(callback, wait) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), wait);
  };
}
