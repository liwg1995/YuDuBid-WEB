# 禹都投标AI助手 / YuDu_Bidkit

<p align="center">
  <img src="apps/web/public/images/yudubid-icon.png" alt="禹都投标AI助手 Logo" width="120" />
</p>

禹都投标AI助手是一个面向招投标业务的 Web 版 AI 标书工作台，目标是把招标文件解析、技术标生成、企业知识库复用、废标项检查、标书查重、Word 导出和系统配置整合到一套可私有化部署的工作流中。

项目参考 [OpenBidKit_Yibiao](https://github.com/liwg1995/OpenBidKit_Yibiao) 的业务模块设计，重点借鉴其 `client/` 目录中的技术方案、知识库、废标项检查、查重、AI 配置和导出流程，并基于 Web 架构重构为前后端分离系统。

## 当前状态

- 已完成现代化 Web 前端主界面和主要业务页面。
- 已完成系统设置中的多 AI 厂商、多模型、文件存储配置界面与后端接口。
- 已完成招标文件上传、文档解析任务、Markdown 中间态和基础项目管理能力。
- 已接入招标要点抽取、章节大纲、知识库正式入库等第一批后端业务接口。
- 商务标模块当前为开发中占位，后续再接入商务响应矩阵、报价辅助和合同偏离表。

## 功能模块

- 项目工作台：集中查看项目、文件、知识库和风险状态。
- 招标文件解析：上传 PDF、DOCX、Markdown 等文件，解析为 Markdown 中间态。
- 技术标生成：生成章节大纲、编辑章节内容，并为后续正文生成和导出提供结构化数据。
- 企业知识库：上传历史资料，沉淀为可复用知识条目。
- 废标项检查：围绕无效投标、废标条款、错别字和逻辑一致性进行检查。
- 标书查重：预留目录、正文、图片和元数据查重工作区。
- Word 导出：汇总技术标正文、检查报告和附件信息，生成导出工作流。
- 系统设置：配置 OpenAI-like 模型、国内外 AI 厂商、文本模型、生图模型、视觉模型、MinIO/OSS/本地存储等。

## 技术栈

- 前端：Next.js + React + TypeScript + Tailwind CSS + shadcn/ui 风格组件
- 后端：NestJS + TypeScript
- 数据库：PostgreSQL + Prisma
- 任务队列：Redis + BullMQ
- 文件存储：MinIO / OSS / 本地存储
- 文档处理：Node.js + Python 辅助服务
- AI 接入：OpenAI-like 多模型适配
- 部署：Docker Compose

## 目录结构

```text
YuDu_Bidkit/
├── apps/
│   ├── web/                 # Next.js 前端应用
│   └── api/                 # NestJS API 服务
├── packages/
│   └── shared/              # 共享类型、厂商配置和常量
├── services/
│   └── document-worker/     # Python 文档处理辅助服务
├── scripts/
│   └── check-web-css.mjs    # 前端 CSS 加载健康检查
├── docs/                    # 架构与开发文档
├── infra/                   # 部署说明
└── docker-compose.yml       # 本地私有化部署编排
```

## 本地启动

安装依赖：

```bash
pnpm install
```

启动基础依赖：

```bash
docker compose up -d postgres redis minio
```

启动开发服务：

```bash
pnpm dev
```

默认访问地址：

- Web 前端：http://localhost:3000
- API 服务：http://localhost:4000
- 文档处理服务：http://localhost:8100
- MinIO 控制台：http://localhost:9001

## Docker Compose 部署

构建并启动整套服务：

```bash
docker compose up --build
```

常用默认配置见 `.env.example` 和 `docker-compose.yml`。生产环境请替换数据库密码、MinIO 密钥、AI API Key、对象存储访问密钥等敏感配置。

## 开发检查

API 构建：

```bash
pnpm --filter @yudu-bidkit/api build
```

前端类型检查：

```bash
pnpm --filter @yudu-bidkit/web typecheck
```

前端 CSS 健康检查：

```bash
pnpm check:web-css
```

> 注意：开发过程中如需检查前端样式，优先使用 `pnpm check:web-css`。避免在 Next.js dev server 运行时频繁执行生产构建，以免临时构建产物影响本地热更新页面。

## 参考项目

- [OpenBidKit_Yibiao](https://github.com/liwg1995/OpenBidKit_Yibiao)：业务流程参考，核心代码位于其 `client/` 目录。
- [YuduBid](https://github.com/liwg1995/YuduBid)：Logo 资源来源。

## 版本管理

当前仓库远程地址：

```bash
git@github.com:liwg1995/YuDuBid-WEB.git
```

后续开发建议按阶段提交：

```bash
git status
git add .
git commit -m "Describe the completed feature"
git push
```
