import http from "node:http";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
await loadLocalEnv();

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.TRADEPILOT_DATA_DIR || path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "tradepilot.sqlite");
const SEED_FILE = process.env.TRADEPILOT_SEED_FILE || path.join(__dirname, "data", "db.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
};

const SYSTEM_PROMPT = [
  "你是“结算宝”，是一个外贸收汇教学助手。",
  "你的目标是引导学生思考、启发式教学、分析风险、提示方向。",
  "禁止直接给正确答案、直接输出标准方案、替学生完成作答。",
  "回复必须简短、自然、像老师提问，每次不超过100字。"
].join("\n");

const STOP_WORDS = new Set([
  "我们", "你们", "他们", "这个", "那个", "一个", "通过", "进行", "可以", "需要",
  "应该", "还有", "学习", "课堂", "本节", "本堂", "认识", "了解", "觉得", "因为",
  "所以", "但是", "如果", "以及", "对于", "风险", "收汇"
]);

let writeQueue = Promise.resolve();

await ensureDatabase();

if (process.argv.includes("--init-db")) {
  console.log(`SQLite database is ready: ${DB_FILE}`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) {
  const db = await readDb();
  if (db.groups.length !== 7 || db.scenarios.length !== 3) {
    throw new Error("Seed data check failed");
  }
  const scenario = db.scenarios.find((item) => item.code === "collection_crisis");
  const now = new Date().toISOString();
  await updateDb(async (testDb) => {
    testDb.submissions.push({
      id: "sub_self_test",
      groupId: "g1",
      scenarioId: scenario.id,
      studentId: null,
      content: "自检提交：检查SQLite读写链路。",
      riskLevel: null,
      paymentStrategy: null,
      score: 70,
      aiFeedback: "自检通过。",
      status: "submitted",
      createdAt: now,
      updatedAt: now
    });
    return null;
  });
  const afterWrite = await readDb();
  if (!afterWrite.submissions.find((item) => item.id === "sub_self_test")) {
    throw new Error("SQLite write/read check failed");
  }
  await resetClassroomData();
  console.log("Self-test passed: SQLite seed, write, read and reset are OK.");
  process.exit(0);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, {
        ok: true,
        time: new Date().toISOString(),
        database: "sqlite",
        aiConfigured: Boolean(process.env.DEEPSEEK_API_KEY)
      });
    }

    if (url.pathname === "/api/bootstrap" && req.method === "GET") {
      const db = await readDb();
      return sendJson(res, db);
    }

    if (url.pathname === "/api/dashboard" && req.method === "GET") {
      const db = await readDb();
      return sendJson(res, buildDashboard(db));
    }

    if (url.pathname === "/api/export" && req.method === "GET") {
      const db = await readDb();
      return sendJson(res, { exportedAt: new Date().toISOString(), ...db });
    }

    if (url.pathname === "/api/admin/reset" && req.method === "POST") {
      await resetClassroomData();
      return sendJson(res, { ok: true });
    }

    if (url.pathname === "/api/submissions" && req.method === "POST") {
      const body = await readBody(req);
      return await handleSubmission(body, res);
    }

    if (url.pathname === "/api/reflections" && req.method === "POST") {
      const body = await readBody(req);
      return await handleReflection(body, res);
    }

    if (url.pathname === "/api/evaluations" && req.method === "POST") {
      const body = await readBody(req);
      return await handleEvaluation(body, res);
    }

    if (url.pathname === "/api/ai" && req.method === "POST") {
      const body = await readBody(req);
      return await handleAi(body, res);
    }

    if (req.method !== "GET") {
      return sendJson(res, { error: "Method Not Allowed" }, 405);
    }

    return await serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, { error: "服务器暂时开小差了，请稍后重试。" }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`TradePilot classroom app is running at http://127.0.0.1:${PORT}`);
  console.log(`Dashboard: http://127.0.0.1:${PORT}/dashboard`);
});

async function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    const fullPath = path.join(__dirname, file);
    try {
      const content = await fs.readFile(fullPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const index = trimmed.indexOf("=");
        if (index === -1) continue;
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
        if (key && !process.env[key]) process.env[key] = value;
      }
    } catch {
      // Local env files are optional.
    }
  }
}

async function serveStatic(routePath, res) {
  const normalizedRoute = routePath === "/" ? "/index.html" : routePath === "/dashboard" ? "/dashboard.html" : routePath;
  const safePath = path.normalize(decodeURIComponent(normalizedRoute)).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(PUBLIC_DIR, safePath);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    return sendText(res, "Forbidden", 403);
  }

  try {
    const data = await fs.readFile(fullPath);
    const type = CONTENT_TYPES[path.extname(fullPath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(data);
  } catch {
    sendText(res, "Not Found", 404);
  }
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) {
      throw new Error("Payload too large");
    }
  }
  return raw ? JSON.parse(raw) : {};
}

async function readDb() {
  const groups = await sqliteJson("SELECT id, name FROM groups ORDER BY id;");
  const students = await sqliteJson("SELECT id, group_id AS groupId, name FROM students ORDER BY id;");
  const scenarios = await sqliteJson("SELECT id, code, title, phase, sort_order AS sortOrder, description FROM scenarios ORDER BY sort_order;");
  const submissions = await sqliteJson(`
    SELECT id, group_id AS groupId, scenario_id AS scenarioId, student_id AS studentId,
           content, risk_level AS riskLevel, payment_strategy AS paymentStrategy,
           score, ai_feedback AS aiFeedback, status, created_at AS createdAt, updated_at AS updatedAt
    FROM submissions
    ORDER BY updated_at;
  `);
  const riskAssessments = await sqliteJson(`
    SELECT id, submission_id AS submissionId, group_id AS groupId,
           customer_credit AS customerCredit, product_attribute AS productAttribute,
           country_risk AS countryRisk, transaction_scale AS transactionScale,
           total_score AS totalScore, risk_level AS riskLevel, updated_at AS updatedAt
    FROM risk_assessments
    ORDER BY updated_at;
  `);
  const aiMessages = await sqliteJson(`
    SELECT id, group_id AS groupId, student_id AS studentId, scene,
           user_message AS userMessage, assistant_message AS assistantMessage,
           retry_count AS retryCount, success, error_message AS errorMessage, created_at AS createdAt
    FROM ai_messages
    ORDER BY created_at;
  `);
  const reflections = await sqliteJson(`
    SELECT id, group_id AS groupId, student_id AS studentId, student_name AS studentName,
           content, created_at AS createdAt
    FROM reflections
    ORDER BY created_at;
  `);
  const evaluations = await sqliteJson(`
    SELECT id, type, group_id AS groupId, student_id AS studentId, student_name AS studentName,
           target_group_id AS targetGroupId, score, content, created_at AS createdAt
    FROM evaluations
    ORDER BY created_at;
  `);

  return {
    groups,
    students,
    scenarios,
    submissions: submissions.map((item) => ({ ...item, score: Number(item.score || 0) })),
    riskAssessments: riskAssessments.map((item) => ({
      ...item,
      customerCredit: Number(item.customerCredit || 0),
      productAttribute: Number(item.productAttribute || 0),
      countryRisk: Number(item.countryRisk || 0),
      transactionScale: Number(item.transactionScale || 0),
      totalScore: Number(item.totalScore || 0)
    })),
    aiMessages: aiMessages.map((item) => ({ ...item, success: Boolean(item.success) })),
    reflections,
    evaluations: evaluations.map((item) => ({ ...item, score: Number(item.score || 0) }))
  };
}

async function updateDb(mutator) {
  writeQueue = writeQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await saveDynamicData(db);
    return result;
  });
  return writeQueue;
}

async function ensureDatabase() {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await sqliteExec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      phase INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      scenario_id TEXT NOT NULL REFERENCES scenarios(id),
      student_id TEXT REFERENCES students(id),
      content TEXT NOT NULL,
      risk_level TEXT,
      payment_strategy TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      ai_feedback TEXT,
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(group_id, scenario_id)
    );

    CREATE TABLE IF NOT EXISTS risk_assessments (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL UNIQUE REFERENCES submissions(id),
      group_id TEXT NOT NULL REFERENCES groups(id),
      customer_credit INTEGER NOT NULL,
      product_attribute INTEGER NOT NULL,
      country_risk INTEGER NOT NULL,
      transaction_scale INTEGER NOT NULL,
      total_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      student_id TEXT REFERENCES students(id),
      scene TEXT NOT NULL,
      user_message TEXT NOT NULL,
      assistant_message TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      success INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reflections (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      student_id TEXT REFERENCES students(id),
      student_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('self', 'peer')),
      group_id TEXT NOT NULL REFERENCES groups(id),
      student_id TEXT REFERENCES students(id),
      student_name TEXT NOT NULL,
      target_group_id TEXT REFERENCES groups(id),
      score INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_group ON submissions(group_id);
    CREATE INDEX IF NOT EXISTS idx_ai_messages_group ON ai_messages(group_id);
    CREATE INDEX IF NOT EXISTS idx_reflections_group ON reflections(group_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_group ON evaluations(group_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_target ON evaluations(target_group_id);
  `);

  const existing = await sqliteJson("SELECT COUNT(*) AS count FROM groups;");
  const seed = JSON.parse(await fs.readFile(SEED_FILE, "utf8"));
  if (Number(existing[0]?.count || 0) > 0) {
    await syncStaticData(seed);
    return;
  }

  await seedStaticData(seed);
}

async function seedStaticData(seed) {
  const statements = [
    "BEGIN IMMEDIATE;",
    ...seed.groups.map((group) => insertSql("groups", { id: group.id, name: group.name })),
    ...seed.students.map((student) =>
      insertSql("students", { id: student.id, group_id: student.groupId, name: student.name })
    ),
    ...seed.scenarios.map((scenario) =>
      insertSql("scenarios", {
        id: scenario.id,
        code: scenario.code,
        title: scenario.title,
        phase: scenario.phase,
        sort_order: scenario.sortOrder,
        description: scenario.description
      })
    ),
    "COMMIT;"
  ];
  await sqliteExec(statements.join("\n"));
}

async function syncStaticData(seed) {
  const statements = [
    "BEGIN IMMEDIATE;",
    ...seed.groups.map((group) => insertSql("groups", { id: group.id, name: group.name })),
    ...seed.scenarios.map((scenario) =>
      insertSql("scenarios", {
        id: scenario.id,
        code: scenario.code,
        title: scenario.title,
        phase: scenario.phase,
        sort_order: scenario.sortOrder,
        description: scenario.description
      })
    ),
    ...seed.students.map((student) =>
      insertSql("students", { id: student.id, group_id: student.groupId, name: student.name })
    ),
    "COMMIT;"
  ];
  await sqliteExec(statements.join("\n"));
}

async function saveDynamicData(db) {
  const statements = [
    "PRAGMA foreign_keys = OFF;",
    "BEGIN IMMEDIATE;",
    "DELETE FROM risk_assessments;",
    "DELETE FROM submissions;",
    "DELETE FROM ai_messages;",
    "DELETE FROM reflections;",
    "DELETE FROM evaluations;",
    ...db.submissions.map((item) =>
      insertSql("submissions", {
        id: item.id,
        group_id: item.groupId,
        scenario_id: item.scenarioId,
        student_id: item.studentId || null,
        content: item.content,
        risk_level: item.riskLevel || null,
        payment_strategy: item.paymentStrategy || null,
        score: Number(item.score || 0),
        ai_feedback: item.aiFeedback || "",
        status: item.status || "submitted",
        created_at: item.createdAt,
        updated_at: item.updatedAt
      })
    ),
    ...db.riskAssessments.map((item) =>
      insertSql("risk_assessments", {
        id: item.id,
        submission_id: item.submissionId,
        group_id: item.groupId,
        customer_credit: Number(item.customerCredit || 1),
        product_attribute: Number(item.productAttribute || 1),
        country_risk: Number(item.countryRisk || 1),
        transaction_scale: Number(item.transactionScale || 1),
        total_score: Number(item.totalScore || 0),
        risk_level: item.riskLevel,
        updated_at: item.updatedAt
      })
    ),
    ...db.aiMessages.map((item) =>
      insertSql("ai_messages", {
        id: item.id,
        group_id: item.groupId,
        student_id: item.studentId || null,
        scene: item.scene || "assistant",
        user_message: item.userMessage,
        assistant_message: item.assistantMessage,
        retry_count: Number(item.retryCount || 0),
        success: item.success ? 1 : 0,
        error_message: item.errorMessage || "",
        created_at: item.createdAt
      })
    ),
    ...db.reflections.map((item) =>
      insertSql("reflections", {
        id: item.id,
        group_id: item.groupId,
        student_id: item.studentId || null,
        student_name: item.studentName || "学生",
        content: item.content,
        created_at: item.createdAt
      })
    ),
    ...db.evaluations.map((item) =>
      insertSql("evaluations", {
        id: item.id,
        type: item.type,
        group_id: item.groupId,
        student_id: item.studentId || null,
        student_name: item.studentName || "学生",
        target_group_id: item.targetGroupId || null,
        score: Number(item.score || 0),
        content: item.content,
        created_at: item.createdAt
      })
    ),
    "COMMIT;",
    "PRAGMA foreign_keys = ON;"
  ];
  await sqliteExec(statements.join("\n"));
}

async function resetClassroomData() {
  await sqliteExec(`
    PRAGMA foreign_keys = OFF;
    BEGIN IMMEDIATE;
    DELETE FROM risk_assessments;
    DELETE FROM submissions;
    DELETE FROM ai_messages;
    DELETE FROM reflections;
    DELETE FROM evaluations;
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

async function sqliteJson(sql) {
  const output = await sqliteExec(sql, true);
  return output.trim() ? JSON.parse(output) : [];
}

function sqliteExec(sql, json = false) {
  return new Promise((resolve, reject) => {
    const args = json ? ["-json", DB_FILE] : [DB_FILE];
    const child = spawn("sqlite3", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `sqlite3 exited with code ${code}`));
    });

    child.stdin.end(`.bail on\n.timeout 5000\n${sql}\n`);
  });
}

function insertSql(table, row) {
  const columns = Object.keys(row);
  const values = columns.map((column) => sqlValue(row[column])).join(", ");
  return `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${values});`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function handleSubmission(body, res) {
  const result = await updateDb(async (db) => {
    const scenario = db.scenarios.find((item) => item.code === body.scenarioCode);
    const group = db.groups.find((item) => item.id === body.groupId);
    if (!scenario || !group) {
      return { error: "提交失败：小组或任务不存在。", status: 400 };
    }

    const content = String(body.content || "").trim();
    if (content.length < 4) {
      return { error: "请先写下你们小组的方案。", status: 400 };
    }

    const now = new Date().toISOString();
    const previous = db.submissions.find(
      (item) => item.groupId === group.id && item.scenarioId === scenario.id
    );
    const scoreInfo = scoreSubmission(scenario.code, content, body);
    const submission = previous || {
      id: createId("sub"),
      groupId: group.id,
      scenarioId: scenario.id,
      createdAt: now
    };

    Object.assign(submission, {
      studentId: body.studentId || null,
      content,
      riskLevel: body.riskLevel || scoreInfo.riskLevel || null,
      paymentStrategy: body.paymentStrategy || null,
      score: scoreInfo.score,
      aiFeedback: scoreInfo.feedback,
      status: "submitted",
      updatedAt: now
    });

    if (!previous) db.submissions.push(submission);

    if (scenario.code === "mixed_payment" && body.riskAssessment) {
      const assessment = {
        id: createId("risk"),
        submissionId: submission.id,
        groupId: group.id,
        customerCredit: Number(body.riskAssessment.customerCredit || 1),
        productAttribute: Number(body.riskAssessment.productAttribute || 1),
        countryRisk: Number(body.riskAssessment.countryRisk || 1),
        transactionScale: Number(body.riskAssessment.transactionScale || 1),
        totalScore: Number(body.riskAssessment.totalScore || 0),
        riskLevel: body.riskLevel || scoreInfo.riskLevel || "low",
        updatedAt: now
      };
      db.riskAssessments = db.riskAssessments.filter((item) => item.submissionId !== submission.id);
      db.riskAssessments.push(assessment);
    }

    return {
      submission,
      stageOneComplete: hasSubmitted(db, group.id, "collection_crisis") && hasSubmitted(db, group.id, "lc_crisis")
    };
  });

  if (result.error) return sendJson(res, { error: result.error }, result.status || 400);
  return sendJson(res, result);
}

async function handleReflection(body, res) {
  const result = await updateDb(async (db) => {
    const group = db.groups.find((item) => item.id === body.groupId);
    if (!group) return { error: "请选择小组。", status: 400 };

    const content = String(body.content || "").trim();
    if (content.length < 3) return { error: "请先写下课堂收获与体会。", status: 400 };

    const reflection = {
      id: createId("ref"),
      groupId: group.id,
      studentId: body.studentId || null,
      studentName: String(body.studentName || "学生").trim(),
      content,
      createdAt: new Date().toISOString()
    };
    db.reflections.push(reflection);
    return { reflection, wordCloud: generateWordCloud(db.reflections) };
  });

  if (result.error) return sendJson(res, { error: result.error }, result.status || 400);
  return sendJson(res, result);
}

async function handleEvaluation(body, res) {
  const result = await updateDb(async (db) => {
    const type = body.type === "peer" ? "peer" : "self";
    const group = db.groups.find((item) => item.id === body.groupId);
    const student = db.students.find((item) => item.id === body.studentId && item.groupId === body.groupId);
    if (!group) return { error: "请选择评价小组。", status: 400 };
    if (!student) return { error: "请选择评价学生。", status: 400 };

    const targetGroupId = type === "peer" ? String(body.targetGroupId || "") : group.id;
    const targetGroup = db.groups.find((item) => item.id === targetGroupId);
    if (!targetGroup) return { error: "请选择被评价小组。", status: 400 };
    if (type === "peer" && targetGroup.id === group.id) {
      return { error: "互评请选择其他小组。", status: 400 };
    }

    const score = Math.max(1, Math.min(5, Number(body.score || 0)));
    if (!Number.isFinite(score) || score < 1) return { error: "请选择1-5分评价。", status: 400 };

    const content = String(body.content || "").trim();
    if (content.length < 4) return { error: "请写下评价理由。", status: 400 };

    const evaluation = {
      id: createId(type === "peer" ? "peer" : "self"),
      type,
      groupId: group.id,
      studentId: student.id,
      studentName: student.name,
      targetGroupId,
      score,
      content,
      createdAt: new Date().toISOString()
    };
    db.evaluations.push(evaluation);
    return { evaluation };
  });

  if (result.error) return sendJson(res, { error: result.error }, result.status || 400);
  return sendJson(res, result);
}

async function handleAi(body, res) {
  const question = String(body.question || "").trim();
  if (Array.from(question).length < 2) {
    return sendJson(res, { error: "请至少输入两个字，例如：托收拒付怎么办？" }, 400);
  }

  const db = await readDb();
  const groupId = body.groupId || "g1";
  const recent = db.aiMessages
    .filter((item) => item.groupId === groupId && item.success)
    .slice(-4)
    .flatMap((item) => [
      { role: "user", content: item.userMessage },
      { role: "assistant", content: item.assistantMessage }
    ]);

  let answer = "";
  let success = false;
  let errorMessage = "";
  let retryCount = 0;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    retryCount = attempt;
    try {
      answer = await askDeepSeek(question, body.scene || "general", recent);
      success = true;
      break;
    } catch (error) {
      errorMessage = error.message || String(error);
    }
  }

  if (!success) {
    answer = fallbackAiAnswer(question);
  }

  answer = sanitizeAiAnswer(answer);

  await updateDb(async (dbForWrite) => {
    dbForWrite.aiMessages.push({
      id: createId("ai"),
      groupId,
      studentId: body.studentId || null,
      scene: body.scene || "assistant",
      userMessage: question,
      assistantMessage: answer,
      retryCount,
      success,
      errorMessage: success ? "" : errorMessage,
      createdAt: new Date().toISOString()
    });
    return null;
  });

  return sendJson(res, { answer, success, retryCount });
}

async function askDeepSeek(question, scene, recentMessages) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const payload = {
    model: "deepseek-chat",
    messages: buildAiMessages(question, scene, recentMessages),
    temperature: 0.4,
    max_tokens: 160
  };

  try {
    return await askDeepSeekWithFetch(apiKey, payload);
  } catch (error) {
    return await askDeepSeekWithCurl(apiKey, payload, error);
  }
}

function buildAiMessages(question, scene, recentMessages) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...recentMessages,
    {
      role: "user",
      content: `当前场景：${scene}。\n学生问题：${question}\n请用启发式问题或提示回应，避免直接给答案。`
    }
  ];
}

async function askDeepSeekWithFetch(apiKey, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        ...payload
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned empty content");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

async function askDeepSeekWithCurl(apiKey, payload, originalError) {
  const config = [
    'url = "https://api.deepseek.com/chat/completions"',
    'request = "POST"',
    'max-time = "15"',
    'silent',
    'show-error',
    'fail-with-body',
    'header = "Content-Type: application/json"',
    `header = ${curlQuote(`Authorization: Bearer ${apiKey}`)}`,
    `data = ${curlQuote(JSON.stringify(payload))}`
  ].join("\n");

  const output = await new Promise((resolve, reject) => {
    const child = spawn("curl", ["-K", "-"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || originalError?.message || `curl exited with code ${code}`));
    });
    child.stdin.end(config);
  });

  const data = JSON.parse(output);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned empty content via curl");
  return content;
}

function curlQuote(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function scoreSubmission(code, content, body) {
  if (code === "mixed_payment") {
    return scoreMixedPayment(content, body);
  }

  const keywordScore = countMatches(content, [
    "货权", "单据", "沟通", "保险", "银行", "客户", "风险", "证据", "转售", "协商",
    "改单", "开证行", "不符", "港口", "拒付"
  ]);
  const lengthScore = Math.min(35, Math.floor(content.length / 6));
  const score = Math.min(92, 45 + lengthScore + keywordScore * 4);
  const feedback =
    code === "collection_crisis"
      ? "已收到方案。再想想：货权还能否控制？客户拒付后的备选买家、单据和沟通证据是否完整？"
      : "已收到方案。再检查：不符点能否补救？改单、银行沟通和目的港变化的证据链是否清楚？";

  return { score, feedback, riskLevel: null };
}

function scoreMixedPayment(content, body) {
  const text = `${content} ${body.paymentStrategy || ""}`.replace(/\s+/g, "");
  const riskLevel = body.riskLevel || "low";
  const has20 = /20%|20％|百分之二十|两成/.test(text);
  const has80 = /80%|80％|百分之八十|八成/.test(text);
  const hasAdvance = /预付款|预付|订金|定金/.test(text);
  const hasCollection = /托收|D\/P|D\/A/i.test(text);
  const hasLc = /信用证|L\/C|LC/i.test(text);
  const lowRisk = riskLevel === "low";

  if (lowRisk && has20 && has80 && hasAdvance && hasCollection) {
    return {
      score: 96,
      riskLevel,
      feedback: "方向很稳。可以再说明20%预付款覆盖哪些成本，以及80%托收主要承担哪些风险。"
    };
  }

  if (lowRisk && has20 && has80 && hasLc && hasCollection) {
    return {
      score: 86,
      riskLevel,
      feedback: "组合基本可行。再比较一下信用证成本与低风险客户之间是否匹配，理由会更完整。"
    };
  }

  const base = lowRisk ? 62 : riskLevel === "medium" ? 58 : 52;
  const detail = countMatches(text, ["预付款", "信用证", "托收", "比例", "风险", "客户", "国家", "金额"]);
  return {
    score: Math.min(82, base + detail * 3),
    riskLevel,
    feedback: "已记录策略。先回到风险等级，再判断付款比例是否能覆盖客户、国家和商品风险。"
  };
}

function buildDashboard(db) {
  const submissions = db.submissions.map((submission) => {
    const scenario = db.scenarios.find((item) => item.id === submission.scenarioId);
    const group = db.groups.find((item) => item.id === submission.groupId);
    return {
      ...submission,
      scenarioCode: scenario?.code,
      scenarioTitle: scenario?.title || "未知任务",
      groupName: group?.name || "未知小组"
    };
  });

  const scenarioStats = db.scenarios.map((scenario) => {
    const items = submissions.filter((item) => item.scenarioId === scenario.id);
    const avgScore = items.length
      ? Math.round(items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length)
      : 0;
    return {
      code: scenario.code,
      title: scenario.title,
      phase: scenario.phase,
      submittedGroups: new Set(items.map((item) => item.groupId)).size,
      totalGroups: db.groups.length,
      avgScore
    };
  });

  const riskDistribution = ["low", "medium", "high"].map((level) => ({
    level,
    count: db.riskAssessments.filter((item) => item.riskLevel === level).length
  }));

  const groupProgress = db.groups.map((group) => {
    const groupSubmissions = submissions.filter((item) => item.groupId === group.id);
    const selfItems = db.evaluations.filter((item) => item.type === "self" && item.groupId === group.id);
    const peerItems = db.evaluations.filter((item) => item.type === "peer" && item.targetGroupId === group.id);
    return {
      groupId: group.id,
      groupName: group.name,
      collection: Boolean(groupSubmissions.find((item) => item.scenarioCode === "collection_crisis")),
      lc: Boolean(groupSubmissions.find((item) => item.scenarioCode === "lc_crisis")),
      mixed: Boolean(groupSubmissions.find((item) => item.scenarioCode === "mixed_payment")),
      avgScore: groupSubmissions.length
        ? Math.round(groupSubmissions.reduce((sum, item) => sum + Number(item.score || 0), 0) / groupSubmissions.length)
        : 0,
      selfCount: selfItems.length,
      selfAvg: averageScore(selfItems),
      peerCount: peerItems.length,
      peerAvg: averageScore(peerItems)
    };
  });

  const evaluationSummary = {
    total: db.evaluations.length,
    selfCount: db.evaluations.filter((item) => item.type === "self").length,
    peerCount: db.evaluations.filter((item) => item.type === "peer").length,
    selfAvg: averageScore(db.evaluations.filter((item) => item.type === "self")),
    peerAvg: averageScore(db.evaluations.filter((item) => item.type === "peer"))
  };

  const evaluations = db.evaluations
    .map((item) => ({
      ...item,
      groupName: db.groups.find((group) => group.id === item.groupId)?.name || "未知小组",
      targetGroupName: db.groups.find((group) => group.id === item.targetGroupId)?.name || "未知小组"
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    totalGroups: db.groups.length,
    totalSubmissions: submissions.length,
    totalReflections: db.reflections.length,
    totalEvaluations: db.evaluations.length,
    scenarioStats,
    riskDistribution,
    groupProgress,
    evaluationSummary,
    evaluations: evaluations.slice(0, 40),
    recentSubmissions: submissions
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 20),
    reflections: db.reflections.slice(-30).reverse(),
    wordCloud: generateWordCloud(db.reflections),
    aiHealth: {
      total: db.aiMessages.length,
      success: db.aiMessages.filter((item) => item.success).length,
      fallback: db.aiMessages.filter((item) => !item.success).length
    }
  };
}

function averageScore(items) {
  return items.length
    ? Number((items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length).toFixed(1))
    : 0;
}

function hasSubmitted(db, groupId, scenarioCode) {
  const scenario = db.scenarios.find((item) => item.code === scenarioCode);
  return Boolean(scenario && db.submissions.find((item) => item.groupId === groupId && item.scenarioId === scenario.id));
}

function generateWordCloud(reflections) {
  const counts = new Map();
  const segmenter = typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter("zh", { granularity: "word" })
    : null;

  for (const reflection of reflections) {
    const text = String(reflection.content || "").replace(/[，。！？、；：“”"'（）()《》,.!?;:\n\r]/g, " ");
    const words = segmenter
      ? Array.from(segmenter.segment(text)).filter((item) => item.isWordLike).map((item) => item.segment)
      : text.split(/\s+/);

    for (const raw of words) {
      const word = raw.trim();
      if (word.length < 2 || /^\d+$/.test(word) || STOP_WORDS.has(word)) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([term, weight]) => ({ term, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 50);
}

function fallbackAiAnswer(question) {
  if (/托收|拒付|退税|货权/.test(question)) {
    return "先想两个点：货权现在在哪里？客户拒付后，你们还能用哪些单据或备选买家降低损失？";
  }
  if (/信用证|不符|开证行|港口|改单/.test(question)) {
    return "可以先拆开看：不符点来自单据、港口变更，还是信用证条款？哪一项最容易补救？";
  }
  if (/混合|预付款|比例|托收|信用证/.test(question)) {
    return "先判断客户风险和国家风险，再想预付款比例能覆盖哪些成本，剩余部分适合谁来保障？";
  }
  return "先别急着定方案。你可以从客户信用、货权控制、银行保障和成本四个角度各想一条风险。";
}

function sanitizeAiAnswer(answer) {
  const cleaned = String(answer || "").replace(/\s+/g, " ").trim();
  const softened = cleaned
    .replace(/正确答案是[:：]?/g, "")
    .replace(/标准方案是[:：]?/g, "")
    .replace(/你应该直接/g, "可以考虑");
  return Array.from(softened).slice(0, 100).join("");
}

function countMatches(text, words) {
  return words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function sendText(res, text, status = 200) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}
