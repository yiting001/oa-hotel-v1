# 表单字段总目录

本目录依据 OA.docx 中的 21 张表单截图逐字段整理。截图原件保存在 `docs/assets/source-forms/`，用于后续 UI 和验收对照。

## 1. 通用系统字段

以下字段由平台统一提供，不要求每张截图重复绘制：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| documentId | UUID | 单据内部标识 |
| documentNo | String | 编号规则服务生成的业务编号 |
| tenantId | UUID | 组织隔离标识 |
| initiatorId | UUID | 发起人 |
| initiatorDepartmentId | UUID | 发起时部门快照 |
| status | Enum | 草稿、审批中、已完成、已撤回、已作废、已归档 |
| processInstanceId | UUID | 关联流程实例 |
| formVersion | Integer | 绑定的表单版本 |
| revision | Integer | 乐观锁及修订号 |
| attachments | Attachment[] | 通用附件区 |
| approvalOpinions | Opinion[] | 审批意见区 |
| createdAt/updatedAt | DateTime | 创建和更新时间 |

## 2. 字段设计规则

1. 金额使用 `Money` 值对象，数据库存整数分和币种。
2. 日期与时间分开建模；需要时区的时间使用 UTC 存储。
3. 部门、人员、会计科目、印章等使用引用 ID，表单快照另存显示名称。
4. “大写金额”由系统根据小写金额计算，只读，禁止人工造成不一致。
5. 自动字段可在页面展示，但不允许用户覆盖。
6. 必填性可被流程节点加强，不能弱化业务层的硬性校验。
7. 下列表格中的“建议必填”需要业务确认后固化为规则。

## 3. 表单分册

- [合同与财务表单](contract-and-finance.md)
- [行政、物资与人力表单](administration-supply-hr.md)
- [会议宴会 EO 表单](meeting-event-order.md)
- [公文、信息与党群表单](documents-and-party.md)

## 4. 表单组件

| 组件 | 用途 |
| --- | --- |
| Text/LongText | 单行、长文本 |
| Number/Money | 数量、金额 |
| Date/DateRange/Time | 日期和时间 |
| UserPicker/DepartmentPicker | 组织人员选择 |
| DictSelect/Radio/Checkbox | 字典、单选、多选 |
| Attachment | 附件上传和权限 |
| EditableTable | 申购物品、领用明细 |
| ReservationTable | 客房、用餐、会场预订明细 |
| AccountingSubjectPicker | 会计科目 |
| BankAccountPicker | 收款单位、账号、开户行联动 |
| ApprovalTimeline | 审批意见和流程轨迹 |
| RelatedDocumentPicker | 关联请示、合同、支出等来源单据 |
