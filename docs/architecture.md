# YuDu_Bidkit 架构说明

## 分层

- `apps/web`：投标助手 Web 工作台，负责项目、文件、任务和生成结果的交互。
- `apps/api`：业务 API，负责项目空间、任务调度、模型适配、文档入口和数据持久化。
- `services/document-worker`：文档解析辅助服务，承接复杂 PDF、DOCX、OCR、MinerU 等处理。
- `packages/shared`：前后端共享类型、常量和协议。

## 核心业务流

1. 用户创建投标项目。
2. 上传招标文件，文件进入 MinIO / OSS / 本地存储。
3. API 创建 `tender_parse` 任务并投递 BullMQ。
4. Worker 调用文档解析服务，把结果整理为 Markdown。
5. AI 模块基于招标文件、知识库和 Prompt 生成大纲、正文、风险检查结果。
6. 用户编辑确认后导出 Word。

## 设计原则

- Web 端负责体验和协作，不直接承载长时间阻塞任务。
- 长任务全部任务化，可恢复、可追踪、可重试。
- 文档原文、Markdown 中间态、AI 输出分层保存。
- AI 接口统一走 OpenAI-like 适配层，避免业务模块绑定某一家模型。
