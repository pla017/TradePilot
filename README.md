# TradePilot 外贸收汇风险课堂互动系统

## 启动

```bash
npm run dev
```

如果 3000 端口已有旧服务，可直接运行：

```bash
./restart-dev.sh
```

启动后访问：

- 学生端：http://127.0.0.1:3000/
- 教师看板：http://127.0.0.1:3000/dashboard

常用检查：

```bash
npm run db:init
npm run self-test
npm run check:ai
```

## 功能

- 第一阶段同步展示“托收收汇危机”和“信用证收汇危机”。
- 第一阶段两项提交后显示“下一关”，再展开“混合支付风险适配”。
- 三类任务提交都会同步到教师看板。
- 混合支付支持风险评估表和评分规则。
- 结算宝支持 DeepSeek 启发式问答、失败重试和本地兜底回复。
- 支持浏览器语音输入和 AI 回复朗读，优先兼容 Chrome。
- 课堂收获会自动汇总为教师端词云。

## 数据

正式运行数据存放在 SQLite 数据库 `data/tradepilot.sqlite`。首次启动时会从 `data/db.json` 写入 7 个小组、学生和任务种子数据。

如果要重新开始一节课，可以在教师看板点击“清空课堂数据”。该操作会清空提交、风险评估、AI 记录和课堂收获，但保留小组、学生和任务配置。

## AI 配置

本地开发使用 `.env.local` 中的 `DEEPSEEK_API_KEY`。该文件已加入 `.gitignore`，不会进入代码仓库。

修改 `.env.local` 后需要重启 `npm run dev` 才会生效。
