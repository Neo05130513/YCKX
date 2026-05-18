# 延成科讯管理系统

基于产品文档和 UI 规范初始化的 monorepo 项目，包含内部管理后台、客户移动端网页、后端 API 和共享业务类型。

## 项目结构

```text
apps/
  admin-web/      内部管理后台，Vue 3 + Element Plus
  customer-web/   客户移动端网页，Vue 3 + Vant
  api/            后端 API，NestJS + Prisma
packages/
  shared/         共享枚举、状态标签、主题色
docs/             产品、UI、开发文档
```

## 技术栈

- Vue 3
- TypeScript
- Vite
- Element Plus
- Vant
- NestJS
- Prisma
- PostgreSQL
- pnpm workspace

## 环境要求

- Node.js 24+
- pnpm 11+
- PostgreSQL 14+

## 安装依赖

```bash
pnpm install
```

## 环境变量

复制 `.env.example` 为 `.env`，并按实际环境修改：

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yckx?schema=public"
JWT_SECRET="change-me"
PORT=3000
VITE_API_BASE_URL="http://localhost:3000"
```

## 启动开发环境

分别启动：

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:customer
```

或同时启动：

```bash
pnpm dev
```

默认地址：

- API: `http://localhost:3000/api/mock/dashboard`
- 后台管理端: `http://localhost:5173`
- 客户移动端: `http://localhost:5174`

## 构建

```bash
pnpm build
```

## 当前实现范围

- monorepo 基础工程。
- 共享业务状态枚举和中文标签。
- NestJS API 骨架和 mock 接口。
- Prisma 核心业务模型。
- 内部后台基础布局和核心页面骨架。
- 客户移动端基础页面骨架。
- Mock 数据支撑工作台、设备、订单、告警、报修、账单和客户门户。

## 下一阶段建议

- 接入真实登录和 JWT 鉴权。
- 将 mock 接口替换为 Prisma 数据库读写。
- 实现订单出库事务规则。
- 实现客户报修权限校验落库。
- 实现账单生成和逾期任务。
- 完善审批流配置和业务联动。
- 根据 8 个第三方平台接口补充设备字段映射。
