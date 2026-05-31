# openOii-ts

<div align="center">
  <p><strong>故事想法 → 多智能体协作 → 漫剧成片</strong></p>
  <p>基于 <strong>LangGraph.js v1.x</strong> 的 AI 漫剧生成平台 — 纯 TypeScript 重构版</p>

  <p>
    <img src="https://img.shields.io/badge/TypeScript-5.5+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Nest.js-11-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=111827" alt="React 18" />
    <img src="https://img.shields.io/badge/LangGraph.js-v1.x-6D28D9?style=flat-square" alt="LangGraph.js" />
    <img src="https://img.shields.io/badge/pnpm-monorepo-F69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" />
    <img src="https://img.shields.io/badge/Drizzle-ORM-C5F74E?style=flat-square&logo=drizzle&logoColor=111827" alt="Drizzle" />
  </p>
</div>

openOii-ts 是 [openOii](https://github.com/your-org/openOii) 的纯 TypeScript 重构版本。将原项目的 Python FastAPI + LangGraph Python 全面迁移至 **Nest.js + LangGraph.js v1.x**，采用 pnpm monorepo 架构，实现前后端类型共享、关注点分离。

> [!NOTE]
> 这是一个 **LangGraph 学习 / 演示项目**，不适合直接用于工业生产环境。

---

## 与旧版对比

| | 旧版 openOii (Python) | 新版 openOii-ts |
|---|---|---|
| **语言** | Python + TypeScript 异构 | **纯 TypeScript** 全栈 |
| **后端框架** | FastAPI | **Nest.js 11** |
| **Agent 编排** | LangGraph Python 1.0 | **LangGraph.js v1.x** |
| **ORM** | SQLModel / SQLAlchemy | **Drizzle ORM** |
| **类型系统** | Pydantic ↔ TS 手动同步 | **@openoii/shared** Zod 单一数据源 |
| **UI 组件库** | DaisyUI 4 | **shadcn/ui** |
| **状态管理** | 单个巨型 editorStore | **5 领域 Stores** |
| **包管理** | uv + pnpm 分离 | **pnpm monorepo** |
| **人脸检测** | Python InsightFace | **@vladmandic/face-api** (TF.js) |
| **TTS** | Python edge-tts | **edge-tts-universal** (纯 TS) |

---

## 架构总览

```
openOii-ts/
├── packages/
│   ├── shared/          ← 单一数据源：类型 + Zod Schema + 常量
│   ├── agent/           ← LangGraph.js 17 节点状态图 + 6 Agent
│   ├── server/          ← Nest.js 后端 (API + WebSocket + Drizzle)
│   └── frontend/        ← React 18 + shadcn/ui + Vite
├── docker-compose.yml
├── Dockerfile.server
├── Dockerfile.frontend
└── .github/workflows/ci.yml
```

**依赖方向：** `frontend → shared ← server ← agent → shared`  
**调用关系：** `server → agent` (Nest.js AgentModule 桥接 LangGraph)

### 17 节点生成流水线

```
plan_outline → outline_approval → plan_characters → characters_approval
→ plan_shots → shots_approval → render_characters → critique_characters
→ character_images_approval → render_shots → critique_shots
→ shot_images_approval → compose_videos → compose_approval
→ compose_merge → add_audio → __end__
```

- **8** 个生产节点（Outline / Plan / Render / Compose）
- **6** 个审批门（`interrupt()` Human-in-the-Loop）
- **2** 个批判环（质量评分 < 阈值自动重试，最多 2 轮）
- **1** 个审查路由（用户反馈分发）

---

## 快速开始

### 前置要求

- **Node.js** >= 22
- **pnpm** >= 9（`corepack enable && corepack prepare pnpm@latest --activate`）
- **PostgreSQL** 16+ & **Redis** 7+（可通过 Docker 启动）

### 1. 启动基础设施

```bash
# 仅启动 PostgreSQL + Redis（开发模式，前后端本地跑）
docker compose -f docker-compose.dev.yml up -d
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填写 LLM / 图像 / 视频的 API Key
```

本地开发可保持默认值：`TEXT_PROVIDER=anthropic`（需填中转站 Token），`IMAGE_PROVIDER=fake`，`VIDEO_PROVIDER=fake`，无需外部 API 即可跑通完整流水线。

### 3. 安装依赖 & 启动

```bash
pnpm install

# 启动后端 (http://localhost:3000)
cd packages/server && pnpm dev

# 新开终端，启动前端 (http://localhost:15173)
cd packages/frontend && pnpm dev
```

### 4. 一键生产部署

```bash
docker compose up -d
```

- 前端: http://localhost
- API: http://localhost:3000

---

## 开发命令

```bash
# 全量类型检查
pnpm typecheck

# 全量测试（151 用例）
pnpm test

# 监听模式
pnpm test:watch

# Lint + 格式化
pnpm lint
pnpm lint:fix

# 数据库迁移
cd packages/server && pnpm db:generate   # 生成迁移文件
cd packages/server && pnpm db:migrate    # 执行迁移

# 清理
pnpm clean
```

---

## 包说明

### @openoii/shared — 类型 & 常量

```typescript
import { ProjectSchema, type Project } from "@openoii/shared";
import { PHASE2_STAGES, nextStage, WsEventType } from "@openoii/shared/constants";

// Zod 运行时校验 + 编译时类型
const project = ProjectSchema.parse(data);
```

包含 **29 种 Zod Schema**、**Phase2Stage 枚举**、**WsEventType**（30+ 事件）、审批状态、Provider 常量。

### @openoii/agent — LangGraph.js 编排

```typescript
import { buildPhase2Graph, createCheckpointer } from "@openoii/agent";
import { MemorySaver } from "@langchain/langgraph";

const graph = buildPhase2Graph();
const app = graph.compile({ checkpointer: new MemorySaver() });
// 支持 interrupt() + Command({ resume }) 人工审批
```

### @openoii/server — Nest.js 后端

| 模块 | 职责 |
|---|---|
| `CoreModule` | 全局配置、CORS、环境变量 |
| `DatabaseModule` | Drizzle ORM 连接池 |
| `RedisModule` | Redis Pub/Sub + BullMQ |
| `WsModule` | WebSocket Gateway (per-project 房间) |
| `AgentModule` | LangGraph 桥接 + 后台 Job |
| `GenerationModule` | `/generate`、`/resume`、`/cancel`、`/feedback` API |
| `ServicesModule` | LLM / 图像 / 视频 / TTS / 人脸检测 |

### @openoii/frontend — React 前端

| 模块 | 技术 |
|---|---|
| UI 组件 | shadcn/ui (Button, Card, Input...) |
| 路由 | React Router v7 |
| 服务端状态 | TanStack React Query 5 |
| 客户端状态 | Zustand 5 (5 领域 Stores) |
| 画布 | tldraw |
| WS 事件 | 注册表模式 (按事件类型分发) |

---

## 环境变量

完整配置见 [`.env.example`](./.env.example)，共 **54 个变量**，覆盖：

| 分类 | 关键变量 |
|---|---|
| 基础 | `NODE_ENV`, `PORT`, `CORS_ORIGINS` |
| 数据库 | `DATABASE_URL` |
| Redis | `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT` |
| LLM | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL` |
| 文本生成 | `TEXT_PROVIDER`, `TEXT_BASE_URL`, `TEXT_API_KEY`, `TEXT_MODEL` |
| 图像生成 | `IMAGE_PROVIDER`, `IMAGE_BASE_URL`, `IMAGE_API_KEY`, `IMAGE_MODEL` |
| 视频生成 | `VIDEO_PROVIDER`, `VIDEO_BASE_URL`, `DOUBAO_API_KEY` |
| TTS/BGM | `TTS_ENABLED`, `TTS_DEFAULT_VOICE`, `BGM_VOLUME` |
| 工作流 | `CRITIQUE_ENABLED`, `CRITIQUE_SCORE_THRESHOLD`, `THINKING_CHAIN_ENABLED` |

---

## 技术栈

| 层 | 技术 |
|---|---|
| **语言** | TypeScript 5.5+ |
| **包管理** | pnpm 9+ (monorepo) |
| **后端框架** | Nest.js 11 |
| **Agent 编排** | LangGraph.js v1.x |
| **ORM** | Drizzle ORM + drizzle-zod |
| **数据库** | PostgreSQL 16 |
| **缓存/队列** | Redis 7 + BullMQ |
| **前端框架** | React 18 |
| **UI 组件** | shadcn/ui + TailwindCSS 4 + Radix UI |
| **画布** | tldraw |
| **状态管理** | Zustand 5 + TanStack React Query 5 |
| **构建工具** | Vite 6 + tsup |
| **测试** | Vitest 4 + Testing Library + Playwright |
| **CI/CD** | GitHub Actions |
| **部署** | Docker Compose + 多阶段构建 |
| **TTS** | edge-tts-universal (Microsoft Edge TTS) |
| **人脸检测** | @vladmandic/face-api (TensorFlow.js) |
| **LLM** | Anthropic SDK / OpenAI 兼容接口 |

---

## License

MIT
