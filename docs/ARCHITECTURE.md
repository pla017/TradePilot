# TradePilot 架构说明

## 当前实现

本项目采用轻量单体架构：

- `server.js`：Node.js 内置 HTTP 服务，负责静态页面、API、AI 代理、评分和看板统计。
- `public/index.html`：学生端页面，包含结算宝、第一阶段、第二阶段和课堂收获。
- `public/dashboard.html`：教师端数据看板。
- `data/tradepilot.sqlite`：SQLite 数据库，保存课堂提交、风险评估、AI 记录和课堂反馈。
- `data/db.json`：初始化种子数据，首次启动时写入 SQLite。

## 数据模型

`groups`：7 个学生小组。

`students`：学生与小组的基础关系。

`scenarios`：三类课堂任务。

- `collection_crisis`：托收收汇危机。
- `lc_crisis`：信用证收汇危机。
- `mixed_payment`：混合支付风险适配。

`submissions`：小组方案提交，回流到教师看板；同一小组同一任务重复提交会覆盖更新。

`riskAssessments`：混合支付风险评估表。

`aiMessages`：结算宝问答记录、重试结果与兜底状态。

`reflections`：课堂收获与体会，用于词云展示。

## 前端模块

- 学生端：小组选择、结算宝助手、语音输入、AI 朗读、第一阶段双任务、下一关、第二阶段混合支付、课堂收获提交。
- 教师端：总览指标、任务完成度、小组进度、风险分布、最新提交、课堂收获词云。

## 后端模块

- `/api/bootstrap`：学生端初始化数据。
- `/api/submissions`：保存三类任务提交并评分。
- `/api/reflections`：保存课堂收获并生成词云数据。
- `/api/ai`：结算宝启发式问答，支持 DeepSeek 调用、超时、重试和本地兜底。
- `/api/dashboard`：教师看板聚合统计。
- `/api/export`：导出当前课堂数据 JSON。
- `/api/admin/reset`：清空本节课动态数据，保留基础配置。

## AI 规则

系统 Prompt 固定为“结算宝”外贸收汇教学助手。回复目标是启发学生思考、分析风险、提示方向；禁止直接给标准答案；回复会被截断到 100 字以内。未配置 `DEEPSEEK_API_KEY` 或接口失败时，会返回本地启发式兜底话术，保证课堂流程不中断。
