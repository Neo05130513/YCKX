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

- 内部后台已覆盖首页、设备、告警、租赁订单、固定资产、售后报修、财务管理、OA 审批、系统管理和帮助文档。
- 租赁订单已具备创建、会签、合同归档、出库、客户收货、账单、回款、续租、退租和结清闭环。
- OA 审批已具备模板发起、表单字段、节点流转、附件、催办、转办、批量通过、撤销删除和详情检查清单。
- 系统管理已具备账号、角色、字典、接口、审批流、参数、审计、配置快照、恢复配置和交付健康度检查。
- 客户移动端已覆盖首页待办、订单筛选、收货确认、电池查看、报修、账单权限和付款凭证入口。
- Mock API 和 `data/mock-state.json` 支撑本地试运行；生产部署时需要接入真实数据库、对象存储和第三方设备平台。

## 交付文档

- `docs/正式交付验收清单.md`：用于项目验收、上线前检查和回归验证。
- `docs/操作手册-核心流程.md`：用于实施培训和试运行人员交接。
- 后台 `/help` 页面：内置模块说明、岗位路径、常用流程和交付验收说明。

## 生产化建议

- 将 mock 状态迁移为 Prisma/PostgreSQL 持久化事务，并补齐数据迁移脚本。
- 接入正式登录、JWT/会话策略、HTTPS、弱口令更换和审计留存策略。
- 接入合同、审批附件、报修图片和付款凭证的对象存储。
- 根据第三方设备平台接口补充真实设备字段映射、同步任务和异常重试。
- 配置数据库备份、配置快照、日志归档和回滚流程。
