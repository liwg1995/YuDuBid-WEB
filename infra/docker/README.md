# Docker 基础设施

当前 `docker-compose.yml` 提供完整服务和开发环境依赖：

- Web：Next.js 前端
- API：NestJS 后端
- Document Worker：Python 文档解析辅助服务
- PostgreSQL：业务数据库
- Redis：BullMQ 队列
- MinIO：本地对象存储

启动：

```bash
docker compose up -d postgres redis minio
```

启动完整系统：

```bash
docker compose up --build
```

MinIO 控制台地址：`http://localhost:9001`

默认账号：`yudu`

默认密码：`yudu-bidkit`
