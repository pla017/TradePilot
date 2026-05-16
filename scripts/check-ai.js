import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

await loadLocalEnv();

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error("DEEPSEEK_API_KEY is missing.");
  process.exit(1);
}

const payload = {
  model: "deepseek-chat",
  messages: [
    { role: "system", content: "你是接口连通性检查助手。" },
    { role: "user", content: "只回复两个字：连通" }
  ],
  temperature: 0,
  max_tokens: 8
};

try {
  const data = await checkWithFetch(apiKey, payload);
  const text = data?.choices?.[0]?.message?.content?.trim();
  console.log(`DeepSeek API check passed: ${text || "ok"}`);
} catch (error) {
  const data = await checkWithCurl(apiKey, payload);
  const text = data?.choices?.[0]?.message?.content?.trim();
  console.log(`DeepSeek API check passed via curl fallback: ${text || "ok"}`);
}

async function checkWithFetch(key, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function checkWithCurl(key, body) {
  const config = [
    'url = "https://api.deepseek.com/chat/completions"',
    'request = "POST"',
    'max-time = "15"',
    'silent',
    'show-error',
    'fail-with-body',
    'header = "Content-Type: application/json"',
    `header = ${curlQuote(`Authorization: Bearer ${key}`)}`,
    `data = ${curlQuote(JSON.stringify(body))}`
  ].join("\n");

  return new Promise((resolve, reject) => {
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
      if (code !== 0) return reject(new Error(stderr || `curl exited with code ${code}`));
      resolve(JSON.parse(stdout));
    });
    child.stdin.end(config);
  });
}

function curlQuote(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

async function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const content = await fs.readFile(path.resolve(file), "utf8");
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
      // Optional.
    }
  }
}
