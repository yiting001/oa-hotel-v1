# OA Hotel V1

面向酒店企业的响应式 OA 审批与制单系统。规划技术栈为 NestJS、SQLite、Vue 3、Pinia、TypeScript，采用 DDD 分层和模块化单体架构。

当前仓库处于需求与架构阶段，尚未开始业务代码开发。

## 文档入口

- [产品需求与范围](docs/requirements/00-product-requirements.md)
- [领域划分与模块关系](docs/requirements/01-domain-and-module-map.md)
- [工作流需求](docs/requirements/02-workflow-requirements.md)
- [原始需求追踪矩阵](docs/requirements/03-source-traceability.md)
- [表单字段总目录](docs/requirements/forms/README.md)
- [系统架构](docs/architecture/00-system-architecture.md)
- [数据、接口与安全设计](docs/architecture/01-data-api-security.md)
- [响应式 UI/UX 规范](docs/architecture/02-ui-ux.md)
- [开发路线与验收标准](docs/delivery/00-roadmap-and-acceptance.md)
- [待确认事项与决策记录](docs/delivery/01-open-questions.md)

## 核心原则

1. 工作流与业务解耦：业务模块拥有业务数据，流程内核只负责任务流转。
2. 配置代替硬编码：组织、角色、表单、流程、编号、字典、权限均可配置。
3. 版本不可变：已发布表单和流程通过新版本演进，运行实例始终绑定原版本。
4. 全程可追溯：制单、审批、退回、转办、打印、归档等行为均进入审计日志。
5. 渐进式交付：先完成平台内核，再按业务价值逐个交付表单包。
