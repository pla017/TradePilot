import http from "node:http";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
await loadLocalEnv();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
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
  "你是一位专业且极具耐心的国际结算顾问，专为中职外贸专业学生提供服务。",
  "严格按照对话示例回答用户的问题。",
  "每次对话只需要提出一个问题。",
  "如果用户问到的内容在示例中有，直接用示例中的内容进行回复。",
  "回复必须简短、自然、像老师提问，每次不超过100字。",
  "对话示例：",
  "问：出口陶瓷，采用托收，关税上调客户拒绝付款我们打算退货或者和客户协商降价，我们的思路对吗？还有哪些处理办法？",
  "答：这批陶瓷餐具都是标准化外销货品，有没有不用退回、就地处理的办法？",
  "或者答：陶瓷餐具属于通用日用消费品，不是定制专属货品，这批在目的港的货物，能否寻找当地或周边其他海外采购商接手。",
  "问：出口陶瓷，采用托收，关税上调客户拒绝付款我们打算退货还有哪些处理办法？",
  "答：如果我们愿意在货价上做一定让步，刚好抵消客户多交的那部分关税，你觉得客户会不会愿意按时付款？",
  "或者答：这批陶瓷餐具都是标准化外销货品，有没有不用退回、就地处理的办法？",
  "问：出口陶瓷，采用信用证支付，目的港无法停靠，运输路线变更，导致单证不符，应对思路是修改信用证，还有其他方法吗？",
  "答：改证会产生手续费、耗费时间，如果客户合作意愿良好，有没有不用修改信用证的解决方式？",
  "或者答：本次路线变更、港口调整属于客观突发情况，并非我方刻意制单失误。能否通过商务沟通、适当让步的方式，请求客户接受不符点单据。"
].join("\n");

const STOP_WORDS = new Set([
  "我们", "你们", "他们", "这个", "那个", "一个", "通过", "进行", "可以", "需要",
  "应该", "还有", "学习", "课堂", "本节", "本堂", "认识", "了解", "觉得", "因为",
  "所以", "但是", "如果", "以及", "对于", "风险", "收汇"
]);
const WORD_CLOUD_DIRECT_TERM_RE = /^[\p{Script=Han}A-Za-z0-9+#&-]+$/u;
const WORD_CLOUD_HAN_RE = /^\p{Script=Han}+$/u;
const WORD_CLOUD_MERGE_BLOCK_CHARS = new Set([
  "了", "的", "和", "是", "在", "把", "对", "与", "及", "又",
  "也", "很", "更", "先", "再", "都", "就", "还", "会", "吗",
  "我", "你", "他", "她", "它", "这", "那", "其", "该", "让",
  "被", "从", "向", "给", "跟", "同", "于", "并", "才", "已",
  "正", "将", "要", "想", "来", "去"
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
    testDb.submissions = testDb.submissions.filter((item) => item.id !== "sub_self_test");
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
  await updateDb(async (testDb) => {
    testDb.riskAssessments = testDb.riskAssessments.filter((item) => item.submissionId !== "sub_self_test");
    testDb.submissions = testDb.submissions.filter((item) => item.id !== "sub_self_test");
    return null;
  });
  console.log("Self-test passed: SQLite seed, write, read and cleanup are OK.");
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

    if (url.pathname === "/api/quiz-attempts" && req.method === "POST") {
      const body = await readBody(req);
      return await handleQuizAttempt(body, res);
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

server.listen(PORT, HOST, () => {
  const displayHost = HOST === "0.0.0.0" ? "127.0.0.1" : HOST;
  console.log(`TradePilot classroom app is running at http://${displayHost}:${PORT}`);
  console.log(`Dashboard: http://${displayHost}:${PORT}/dashboard`);
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
  const quizAttempts = await sqliteJson(`
    SELECT id, quiz_type AS quizType, group_id AS groupId, student_id AS studentId,
           student_name AS studentName, score, total, answers, content,
           risk_level AS riskLevel, risk_assessment AS riskAssessment,
           feedback, created_at AS createdAt, updated_at AS updatedAt
    FROM quiz_attempts
    ORDER BY updated_at;
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
    evaluations: evaluations.map((item) => ({ ...item, score: Number(item.score || 0) })),
    quizAttempts: quizAttempts.map((item) => ({
      ...item,
      score: Number(item.score || 0),
      total: Number(item.total || 0),
      answers: parseJsonField(item.answers, []),
      riskAssessment: parseJsonField(item.riskAssessment, null)
    }))
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

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      quiz_type TEXT NOT NULL CHECK(quiz_type IN ('pre', 'post', 'mix_exam')),
      group_id TEXT NOT NULL REFERENCES groups(id),
      student_id TEXT REFERENCES students(id),
      student_name TEXT NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      answers TEXT NOT NULL DEFAULT '[]',
      content TEXT,
      risk_level TEXT,
      risk_assessment TEXT,
      feedback TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(quiz_type, student_id)
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_group ON submissions(group_id);
    CREATE INDEX IF NOT EXISTS idx_ai_messages_group ON ai_messages(group_id);
    CREATE INDEX IF NOT EXISTS idx_reflections_group ON reflections(group_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_group ON evaluations(group_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_target ON evaluations(target_group_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_group ON quiz_attempts(group_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_type ON quiz_attempts(quiz_type);
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
    "DELETE FROM quiz_attempts;",
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
    ...db.quizAttempts.map((item) =>
      insertSql("quiz_attempts", {
        id: item.id,
        quiz_type: item.quizType,
        group_id: item.groupId,
        student_id: item.studentId || null,
        student_name: item.studentName || "学生",
        score: Number(item.score || 0),
        total: Number(item.total || 0),
        answers: JSON.stringify(item.answers || []),
        content: item.content || "",
        risk_level: item.riskLevel || null,
        risk_assessment: item.riskAssessment ? JSON.stringify(item.riskAssessment) : null,
        feedback: item.feedback || "",
        created_at: item.createdAt,
        updated_at: item.updatedAt
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
    DELETE FROM quiz_attempts;
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

    const content = String(body.content || "").trim();
    if (content.length < 4) return { error: "请写下评价理由。", status: 400 };
    const score = Number(body.score || 0);

    const evaluation = {
      id: createId(type === "peer" ? "peer" : "self"),
      type,
      groupId: group.id,
      studentId: student.id,
      studentName: student.name,
      targetGroupId,
      score: Number.isFinite(score) ? Math.max(0, Math.min(5, score)) : 0,
      content,
      createdAt: new Date().toISOString()
    };
    db.evaluations.push(evaluation);
    return { evaluation };
  });

  if (result.error) return sendJson(res, { error: result.error }, result.status || 400);
  return sendJson(res, result);
}

async function handleQuizAttempt(body, res) {
  const result = await updateDb(async (db) => {
    const quizType = ["pre", "post", "mix_exam"].includes(body.quizType) ? body.quizType : "";
    const group = db.groups.find((item) => item.id === body.groupId);
    const student = db.students.find((item) => item.id === body.studentId && item.groupId === body.groupId);
    if (!quizType) return { error: "小测类型不存在。", status: 400 };
    if (!group) return { error: "请选择小组。", status: 400 };
    if (!student) return { error: "请选择学生。", status: 400 };

    const now = new Date().toISOString();
    const previous = db.quizAttempts.find((item) => item.quizType === quizType && item.studentId === student.id);
    const attempt = previous || {
      id: createId("quiz"),
      quizType,
      groupId: group.id,
      studentId: student.id,
      studentName: student.name,
      createdAt: now
    };

    const total = Math.max(0, Number(body.total || 0));
    const score = Number(body.score || 0);
    const content = String(body.content || "").trim();
    if (quizType === "mix_exam" && content.length < 4) {
      return { error: "请先填写混合支付策略。", status: 400 };
    }
    if (quizType !== "mix_exam" && (!Array.isArray(body.answers) || !total)) {
      return { error: "请先完成小测题目。", status: 400 };
    }

    Object.assign(attempt, {
      groupId: group.id,
      studentId: student.id,
      studentName: student.name,
      score: Number.isFinite(score) ? Math.max(0, Math.min(score, total || 10)) : 0,
      total,
      answers: Array.isArray(body.answers) ? body.answers : [],
      content,
      riskLevel: body.riskLevel || null,
      riskAssessment: body.riskAssessment || null,
      feedback: String(body.feedback || "").trim(),
      updatedAt: now
    });

    if (!previous) db.quizAttempts.push(attempt);
    return { attempt };
  });

  if (result.error) return sendJson(res, { error: result.error }, result.status || 400);
  return sendJson(res, result);
}

async function handleAi(body, res) {
  const question = String(body.question || "").trim();
  if (Array.from(question).length < 2) {
    return sendJson(res, { error: "请至少输入两个字，例如：托收拒付怎么办？" }, 400);
  }

  const presetAnswer = resolvePresetAiAnswer(question);
  if (presetAnswer) {
    const groupId = body.groupId || "g1";
    const answer = sanitizeAiAnswer(presetAnswer);

    await updateDb(async (dbForWrite) => {
      dbForWrite.aiMessages.push({
        id: createId("ai"),
        groupId,
        studentId: body.studentId || null,
        scene: body.scene || "assistant",
        userMessage: question,
        assistantMessage: answer,
        retryCount: 0,
        success: true,
        errorMessage: "",
        createdAt: new Date().toISOString()
      });
      return null;
    });

    return sendJson(res, { answer, success: true, retryCount: 0, preset: true });
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
      content: `当前场景：${scene}。\n学生问题：${question}\n请只提出一个问题。若命中示例，请优先直接使用示例原句回答，不要扩写，不要直接给标准答案。`
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

  if (code === "collection_crisis") {
    return scoreCollectionCrisis(content);
  }

  if (code === "lc_crisis") {
    return scoreLcCrisis(content);
  }

  return { score: 70, feedback: "已收到方案。", riskLevel: null };
}

function scoreCollectionCrisis(content) {
  const text = compactText(content);
  const checks = [
    /降价|折扣|优惠|让利|减价|价格/.test(text),
    /转售|转卖|他国|其他国家|第三国|另找买家|其他买家/.test(text),
    /退运|退货回国|运回国|退回国内|返回国内/.test(text)
  ];
  const passed = checks.filter(Boolean).length;

  if (passed === 3) {
    return {
      score: 96,
      feedback: "托收收汇危机三项处理对策已完整：协商降价促成履约、转售他国、退运回国。",
      riskLevel: null
    };
  }

  const score = 55 + passed * 12 + Math.min(8, Math.floor(text.length / 18));
  return {
    score: Math.min(score, 88),
    feedback: "托收对策请按三条补齐：协商降价促成履约、将货物转售他国、安排货物退运回国。",
    riskLevel: null
  };
}

function scoreLcCrisis(content) {
  const text = compactText(content);
  const hasAmend = /改证|修改信用证|修证|修改L\/?C|更改信用证/.test(text);
  const hasShundaCost = /顺达|我方|卖方|工贸/.test(text) && /费用|承担|改证费|成本/.test(text);
  const hasBuyDocs = /买单|接受不符点|接受单据|接受单证|付款赎单/.test(text);
  const hasDiscount = /降价|折扣|优惠|让利|减价|价格/.test(text);
  const passed = [hasAmend, hasShundaCost, hasBuyDocs, hasDiscount].filter(Boolean).length;

  if (hasAmend && hasShundaCost && hasBuyDocs && hasDiscount) {
    return {
      score: 96,
      feedback: "信用证收汇危机两项处理对策已完整：协商修改信用证并由顺达工贸承担改证费用；协商买单并给予买方降价优惠。",
      riskLevel: null
    };
  }

  const score = 54 + passed * 10 + Math.min(8, Math.floor(text.length / 18));
  return {
    score: Math.min(score, 88),
    feedback: "信用证对策请按两条补齐：协商修改信用证且改证费用由顺达工贸承担；协商买单并给予买方降价优惠。",
    riskLevel: null
  };
}

function compactText(value) {
  return String(value || "").replace(/\s+/g, "");
}

function scoreMixedPayment(content, body) {
  const text = `${content} ${body.paymentStrategy || ""}`.replace(/\s+/g, "");
  const riskLevel = body.riskLevel || "low";
  const has20 = /20%|20％|百分之二十|两成/.test(text);
  const has80 = /80%|80％|百分之八十|八成/.test(text);
  const has40OrMore = /40%|40％|50%|50％|60%|60％|70%|70％|百分之四十|百分之五十|百分之六十|百分之七十|四成|五成|六成|七成/.test(text);
  const hasAdvance = /预付款|预付|订金|定金/.test(text);
  const hasCollection = /托收|D\/P|D\/A/i.test(text);
  const hasLc = /信用证|L\/C|LC/i.test(text);
  const lowRisk = riskLevel === "low";
  const mediumRisk = riskLevel === "medium";
  const highRisk = riskLevel === "high";

  if (lowRisk && has20 && has80 && hasAdvance && hasCollection) {
    return {
      score: 96,
      riskLevel,
      feedback: "低风险匹配较好：20%预付款+80%托收符合低成本原则。"
    };
  }

  if (mediumRisk && hasAdvance && hasLc && has40OrMore) {
    return {
      score: 92,
      riskLevel,
      feedback: "中风险匹配较好：适度提升预付款或信用证占比，降低托收依赖。"
    };
  }

  if (highRisk && hasAdvance && hasLc && has40OrMore) {
    return {
      score: 92,
      riskLevel,
      feedback: "高风险匹配较好：较高预付款配合信用证，保障强度较足。"
    };
  }

  const base = lowRisk ? 62 : riskLevel === "medium" ? 58 : 52;
  const detail = countMatches(text, ["预付款", "信用证", "托收", "比例", "风险", "客户", "国家", "金额"]);
  return {
    score: Math.min(82, base + detail * 3),
    riskLevel,
    feedback: "策略需改进。请先确认风险等级，再按低/中/高风险原则重新设计支付工具和比例。"
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
  const quizAttempts = db.quizAttempts.map((attempt) => ({
    ...attempt,
    groupName: db.groups.find((group) => group.id === attempt.groupId)?.name || "未知小组"
  }));

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
    const groupQuizAttempts = quizAttempts.filter((item) => item.groupId === group.id);
    return {
      groupId: group.id,
      groupName: group.name,
      collection: Boolean(groupSubmissions.find((item) => item.scenarioCode === "collection_crisis")),
      lc: Boolean(groupSubmissions.find((item) => item.scenarioCode === "lc_crisis")),
      mixed: Boolean(groupSubmissions.find((item) => item.scenarioCode === "mixed_payment")),
      preQuizCount: groupQuizAttempts.filter((item) => item.quizType === "pre").length,
      postQuizCount: groupQuizAttempts.filter((item) => item.quizType === "post").length,
      mixExamCount: groupQuizAttempts.filter((item) => item.quizType === "mix_exam").length,
      avgScore: groupSubmissions.length
        ? Math.round(groupSubmissions.reduce((sum, item) => sum + Number(item.score || 0), 0) / groupSubmissions.length)
        : 0,
      selfCount: selfItems.length,
      selfAvg: averageScore(selfItems),
      peerCount: peerItems.length,
      peerAvg: averageScore(peerItems)
    };
  });
  const quizStats = ["pre", "post", "mix_exam"].map((type) => {
    const items = quizAttempts.filter((item) => item.quizType === type);
    const avgScore = items.length
      ? Number((items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length).toFixed(1))
      : 0;
    return {
      type,
      title: quizTypeLabel(type),
      submittedStudents: new Set(items.map((item) => item.studentId)).size,
      totalStudents: db.students.length,
      avgScore,
      total: type === "mix_exam" ? 10 : 10
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
    totalQuizAttempts: quizAttempts.length,
    scenarioStats,
    quizStats,
    riskDistribution,
    groupProgress,
    evaluationSummary,
    evaluations: evaluations.slice(0, 40),
    recentSubmissions: submissions
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 20),
    recentQuizAttempts: quizAttempts
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

function quizTypeLabel(type) {
  if (type === "pre") return "课前小测";
  if (type === "post") return "课后小测";
  return "课后混合支付策略";
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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
    const chunks = text.split(/\s+/).map((item) => item.trim()).filter(Boolean);

    for (const chunk of chunks) {
      if (shouldKeepWholeChunk(chunk)) {
        addWordCloudCount(counts, chunk);
        continue;
      }

      const words = segmenter
        ? Array.from(segmenter.segment(chunk)).filter((item) => item.isWordLike).map((item) => item.segment.trim()).filter(Boolean)
        : [chunk];
      const mergedIndexes = new Set();

      for (let index = 0; index < words.length - 1; index += 1) {
        const merged = mergeWordCloudSegments(words[index], words[index + 1]);
        if (!merged || !isWordCloudTerm(merged)) continue;
        addWordCloudCount(counts, merged);
        mergedIndexes.add(index);
        mergedIndexes.add(index + 1);
        index += 1;
      }

      words.forEach((word, index) => {
        if (mergedIndexes.has(index)) return;
        addWordCloudCount(counts, word);
      });
    }
  }

  return Array.from(counts.entries())
    .map(([term, weight]) => ({ term, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 50);
}

function addWordCloudCount(counts, raw) {
  const word = String(raw || "").trim();
  if (!isWordCloudTerm(word)) return;
  counts.set(word, (counts.get(word) || 0) + 1);
}

function isWordCloudTerm(word) {
  return countWordCloudChars(word) >= 2 && !/^\d+$/.test(word) && !STOP_WORDS.has(word);
}

function shouldKeepWholeChunk(chunk) {
  const length = countWordCloudChars(chunk);
  return length >= 2 && length <= 6 && WORD_CLOUD_DIRECT_TERM_RE.test(chunk);
}

function mergeWordCloudSegments(left, right) {
  const merged = `${left}${right}`.trim();
  const leftLength = countWordCloudChars(left);
  const rightLength = countWordCloudChars(right);
  const mergedLength = countWordCloudChars(merged);

  if (mergedLength < 3 || mergedLength > 6 || !WORD_CLOUD_HAN_RE.test(merged)) return null;

  const leftSingle = leftLength === 1 && !WORD_CLOUD_MERGE_BLOCK_CHARS.has(left);
  const rightSingle = rightLength === 1 && !WORD_CLOUD_MERGE_BLOCK_CHARS.has(right);

  if ((leftSingle && rightLength >= 2) || (rightSingle && leftLength >= 2)) {
    return merged;
  }

  return null;
}

function countWordCloudChars(text) {
  return Array.from(String(text || "").trim()).length;
}

function fallbackAiAnswer(question) {
  const preset = resolvePresetAiAnswer(question);
  if (preset) return preset;
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

function resolvePresetAiAnswer(question) {
  const text = normalizeAiQuestion(question);

  if (text.includes("出口陶瓷") && text.includes("托收") && text.includes("关税上调") && text.includes("拒绝付款")) {
    if (text.includes("退货还有哪些处理办法")) {
      return "如果我们愿意在货价上做一定让步，刚好抵消客户多交的那部分关税，你觉得客户会不会愿意按时付款？";
    }
    if (text.includes("退货或者和客户协商降价") || text.includes("协商降价")) {
      return "这批陶瓷餐具都是标准化外销货品，有没有不用退回、就地处理的办法？";
    }
    return "陶瓷餐具属于通用日用消费品，不是定制专属货品，这批在目的港的货物，能否寻找当地或周边其他海外采购商接手。";
  }

  if (text.includes("出口陶瓷") && text.includes("信用证支付") && text.includes("目的港无法停靠") && text.includes("单证不符")) {
    if (text.includes("修改信用证") || text.includes("还有其他方法")) {
      return "改证会产生手续费、耗费时间，如果客户合作意愿良好，有没有不用修改信用证的解决方式？";
    }
    return "本次路线变更、港口调整属于客观突发情况，并非我方刻意制单失误。能否通过商务沟通、适当让步的方式，请求客户接受不符点单据。";
  }

  return "";
}

function normalizeAiQuestion(question) {
  return String(question || "")
    .replace(/[，。！？、；：,.!?;:\s]/g, "")
    .replace(/（.*?）|\(.*?\)/g, "")
    .trim();
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
