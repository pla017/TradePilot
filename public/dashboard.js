const dom = {
  refreshBtn: document.querySelector("#refreshBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  totalGroups: document.querySelector("#totalGroups"),
  totalSubmissions: document.querySelector("#totalSubmissions"),
  totalReflections: document.querySelector("#totalReflections"),
  totalEvaluations: document.querySelector("#totalEvaluations"),
  aiFallback: document.querySelector("#aiFallback"),
  scenarioStats: document.querySelector("#scenarioStats"),
  riskBars: document.querySelector("#riskBars"),
  groupProgress: document.querySelector("#groupProgress"),
  wordCloud: document.querySelector("#wordCloud"),
  recentSubmissions: document.querySelector("#recentSubmissions"),
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

loadDashboard();
dom.refreshBtn.addEventListener("click", loadDashboard);
dom.exportBtn.addEventListener("click", exportData);
dom.resetBtn.addEventListener("click", resetData);
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
  dom.aiFallback.textContent = dashboard.aiHealth.fallback;
  renderScenarioStats(dashboard.scenarioStats);
  renderRiskBars(dashboard.riskDistribution);
  renderGroupProgress(dashboard.groupProgress);
  renderWordCloud(dashboard.wordCloud);
  renderRecentSubmissions(dashboard.recentSubmissions);
  renderEvaluations(dashboard.evaluations, dashboard.evaluationSummary);
  renderReflections(dashboard.reflections);
}

function normalizeDashboard(data = {}) {
  return {
    totalGroups: Number(data.totalGroups || 0),
    totalSubmissions: Number(data.totalSubmissions || 0),
    totalReflections: Number(data.totalReflections || 0),
    totalEvaluations: Number(data.totalEvaluations || 0),
    aiHealth: { fallback: 0, ...(data.aiHealth || {}) },
    scenarioStats: Array.isArray(data.scenarioStats) ? data.scenarioStats : [],
    riskDistribution: Array.isArray(data.riskDistribution) ? data.riskDistribution : [],
    groupProgress: Array.isArray(data.groupProgress) ? data.groupProgress : [],
    wordCloud: Array.isArray(data.wordCloud) ? data.wordCloud : [],
    recentSubmissions: Array.isArray(data.recentSubmissions) ? data.recentSubmissions : [],
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
        <div class="stat-row">
          <span>平均分</span>
          <div class="progress-track">
            <div class="progress-fill" style="width:${item.avgScore}%"></div>
          </div>
          <span>${item.avgScore}</span>
        </div>
      `;
    })
    .join("");
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
    dom.groupProgress.innerHTML = `<tr><td colspan="7">暂无小组数据。</td></tr>`;
    return;
  }

  dom.groupProgress.innerHTML = groups
    .map((group) => `
      <tr>
        <td><strong>${escapeHtml(group.groupName)}</strong></td>
        <td>${renderCheck(group.collection)}</td>
        <td>${renderCheck(group.lc)}</td>
        <td>${renderCheck(group.mixed)}</td>
        <td>${group.avgScore || "-"}</td>
        <td>${renderEvaluationCell(group.selfAvg, group.selfCount)}</td>
        <td>${renderEvaluationCell(group.peerAvg, group.peerCount)}</td>
      </tr>
    `)
    .join("");
}

function renderEvaluationCell(avg, count) {
  return count ? `${avg}分 / ${count}条` : "-";
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
  if (!items.length) {
    dom.recentSubmissions.innerHTML = `<div class="submission-item"><p>暂无提交。</p></div>`;
    return;
  }

  dom.recentSubmissions.innerHTML = items
    .map((item) => `
      <article class="submission-item">
        <strong>${escapeHtml(item.groupName)} · ${escapeHtml(item.scenarioTitle)} · ${Number(item.score || 0)}分</strong>
        <p>${escapeHtml(truncate(item.content, 108))}</p>
      </article>
    `)
    .join("");
}

function renderEvaluations(items, summary) {
  const safeSummary = { selfCount: 0, peerCount: 0, selfAvg: null, peerAvg: null, ...(summary || {}) };

  dom.evaluationSummary.innerHTML = `
    <span>自评 ${safeSummary.selfCount || 0} 条 · 均分 ${safeSummary.selfAvg || "-"}</span>
    <span>互评 ${safeSummary.peerCount || 0} 条 · 均分 ${safeSummary.peerAvg || "-"}</span>
  `;

  if (!items.length) {
    dom.evaluationList.innerHTML = `<div class="reflection-item"><p>暂无自评或互评。</p></div>`;
    return;
  }

  dom.evaluationList.innerHTML = items
    .map((item) => {
      const title = item.type === "self"
        ? `自评 · ${escapeHtml(item.groupName)}`
        : `互评 · ${escapeHtml(item.groupName)} → ${escapeHtml(item.targetGroupName)}`;
      return `
        <article class="reflection-item evaluation-item">
          <strong>${title} · ${Number(item.score || 0)}分</strong>
          <p>${escapeHtml(item.studentName)}：${escapeHtml(item.content)}</p>
        </article>
      `;
    })
    .join("");
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
