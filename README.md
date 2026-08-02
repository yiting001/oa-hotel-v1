# OA Hotel V1

面向酒店企业的响应式 OA 审批与制单系统。规划技术栈为 NestJS、SQLite、Vue 3、Pinia、TypeScript，采用 DDD 分层和模块化单体架构。

当前仓库包含 NestJS API、Vue 3 Web、SQLite 迁移，以及公司门户、个人工作台、合同支出、行政印章、物资申购领用等可运行纵向切片。平台层已增加多部门任职、岗位、RBAC 权限和数据范围、流程/表单版本设计、任务候选人固化及独立 A4 打印视图。完整生产流程能力仍以差距审计为准。

## 本地启动

```bash
npm install
npm run build -w @oa/contracts
OA_DEMO_PASSWORD='<本地初始化密码>' \
OA_BOOTSTRAP_ADMIN_USERNAME='office' \
JWT_SECRET='<随机密钥>' \
npm run dev
```

需要显式加载公司门户与业务演示数据时，仅在非生产环境设置 `OA_DEMO_SEED=true`；默认、staging 和 production 都不会自动写入演示数据。酒店业务日期按 `OA_TIME_ZONE` 换算，默认为 `Asia/Shanghai`。

Web 品牌使用 `VITE_OA_COMPANY_NAME` 与 `VITE_OA_PRODUCT_NAME` 配置，公司门户、登录、应用框架和 A4 打印页共用同一配置入口；参考 `apps/web/.env.example`。

首次初始化开发数据库时，所有开发账号使用 `OA_DEMO_PASSWORD` 指定的密码。项目不提供默认明文密码：

`OA_BOOTSTRAP_ADMIN_USERNAME` 只用于首次幂等授予一个已启用账号 `SYSTEM_ADMIN + ALL`，完成初始化后可以移除，后续授权通过组织与权限页面管理。

- `applicant`：申请人
- `manager`：部门总监
- `finance`：财务审核
- `office`：办公室/印章管理员
- `procurement`：采购
- `warehouse`：仓库

## 验证命令

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## 生产打包

```bash
# 生成 dist/oa-hotel-production.tar.gz
npm run package:production

# 构建并使用隔离运行目录验证 server.js、原生依赖和健康检查
npm run verify:production
```

后端业务代码会合并为单个 `api/server.js`。`better-sqlite3` 与 `argon2` 包含平台原生二进制，仍需在 CentOS 的部署包 `api` 目录执行 `npm ci --omit=dev`，不能上传 macOS 的 `node_modules`。

## 文档入口

- [系统操作手册](docs/user-guide/oa-operation-manual.md)
- [产品需求与范围](docs/requirements/00-product-requirements.md)
- [领域划分与模块关系](docs/requirements/01-domain-and-module-map.md)
- [工作流需求](docs/requirements/02-workflow-requirements.md)
- [原始需求追踪矩阵](docs/requirements/03-source-traceability.md)
- [需求反复核对审计](docs/requirements/04-requirement-audit.md)
- [表单字段总目录](docs/requirements/forms/README.md)
- [系统架构](docs/architecture/00-system-architecture.md)
- [数据、接口与安全设计](docs/architecture/01-data-api-security.md)
- [响应式 UI/UX 规范](docs/architecture/02-ui-ux.md)
- [开发路线与验收标准](docs/delivery/00-roadmap-and-acceptance.md)
- [待确认事项与决策记录](docs/delivery/01-open-questions.md)
- [前三模块企业化实现差距审计](docs/delivery/02-enterprise-gap-audit.md)
- [合同支出模块 MVP](docs/modules/contract-business-mvp.md)
- [合同支出企业级 UI](docs/modules/contract-enterprise-ui.md)
- [行政印章模块 MVP](docs/modules/seal-business-mvp.md)
- [行政印章企业级 UI](docs/modules/seal-enterprise-ui.md)
- [物资申购领用模块 MVP](docs/modules/supply-business-mvp.md)
- [物资申购领用企业级 UI](docs/modules/supply-enterprise-ui.md)
- [组织权限、流程与 A4 表单平台](docs/modules/platform-enterprise-foundation.md)
- [企业应用外壳、审批中心与制单入口](docs/modules/enterprise-shell-and-process-start.md)
- [个人工作台高级协作](docs/modules/personal-workbench-advanced.md)
- [公司门户与个人工作台](docs/modules/portal-personal-workbench.md)
- [CentOS / 宝塔生产部署](docs/deployment/centos-baota.md)
- [CentOS 宝塔 Docker 部署](docs/deployment/centos-baota-docker.md)

## 核心原则

1. 工作流与业务解耦：业务模块拥有业务数据，流程内核只负责任务流转。
2. 配置代替硬编码：组织、角色、表单、流程和权限优先配置化；编号与业务字典按差距审计逐步迁移。
3. 版本不可变：已发布表单和流程通过新版本演进，运行实例始终绑定原版本。
4. 全程可追溯：当前固化制单、审批和退回轨迹；转办、打印审计与归档审计按差距审计继续建设。
5. 渐进式交付：先完成平台内核，再按业务价值逐个交付表单包。
