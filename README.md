# 禹都投标AI助手 / YuDu_Bidkit

面向招投标业务的 Web 版 AI 标书工作台。项目采用现代 Web 架构：Next.js 前端、NestJS 后端、PostgreSQL + Prisma、Redis + BullMQ、对象存储、文档处理服务和 OpenAI-like 多模型适配。

## 技术栈

- 前端：Next.js + React + TypeScript + Tailwind CSS + shadcn/ui 风格组件
- 后端：NestJS + TypeScript
- 数据库：PostgreSQL + Prisma
- 任务队列：Redis + BullMQ
- 文件存储：MinIO / OSS / 本地
- 文档处理：Node.js + Python 辅助服务
- AI 接入：OpenAI-like 多模型适配
- 部署：Docker Compose

## 目录结构

```text
apps/
  web/                 # Next.js 前端
  api/                 # NestJS API
packages/
  shared/              # 共享类型与常量
services/
  document-worker/     # Python 文档处理服务占位
infra/
  docker/              # 基础设施配置
```

## 本地启动

只启动开发依赖：

```bash
pnpm install
docker compose up -d postgres redis minio
pnpm dev
```

前端默认运行在 `http://localhost:3000`，API 默认运行在 `http://localhost:4000`。

启动整套 Docker 服务：

```bash
docker compose up --build
```

文档解析辅助服务默认运行在 `http://localhost:8100`。
