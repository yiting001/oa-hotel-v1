# 合同与财务表单

## 1. 合同/支出请示报告

来源：[image6.png](../../assets/source-forms/image6.png)

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 请示编号 | String | 自动生成、只读 |
| 请示题目 | String | 建议必填 |
| 申请部门 | Department | 默认当前部门、可按权限代选 |
| 申请人 | User | 默认当前用户 |
| 请示时间 | DateTime | 默认当前时间 |
| 请示金额 | Money | 支出类必填，非金额请示可为空 |
| 请示内容 | LongText | 必填 |
| 附件 | Attachment[] | 支持多文件 |
| 审批意见 | ApprovalTimeline | 系统生成、只读 |

## 2. 合同/协议审批表

来源：[image7.png](../../assets/source-forms/image7.png)

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 签约部门 | Department | 必填 |
| 签约时间 | Date | 建议必填 |
| 合同/协议名称 | String | 必填 |
| 金额 | Money | 必填，可为零金额协议 |
| 合同/协议对方单位全称 | String/Counterparty | 必填 |
| 合同/协议内容及理由 | LongText | 必填 |
| 附件 | Attachment[] | 合同正文及补充材料 |
| 审批意见 | ApprovalTimeline | 系统生成 |

建议补充但不替代原字段：关联请示、合同类型、合同编号、经办人、开始/结束日期、是否需要用印。

## 3. 合同/协议支出申请表

来源：[image8.png](../../assets/source-forms/image8.png)

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 合同编号 | RelatedContract | 必填，从已审批合同选择 |
| 合同项目 | String | 从合同带出，可按权限修正 |
| 合同开始时间 | Date | 从合同快照带出 |
| 合同金额 | Money | 从合同快照带出 |
| 预算金额 | Money | 必填 |
| 合同结束时间 | Date | 从合同快照带出 |
| 合同签订时间 | Date | 从合同快照带出 |
| 预算累计执行金额 | Money | 系统计算 |
| 会计科目 | AccountingSubject | 财务节点必填 |
| 合同保修期满后预计保养等费用 | Money | 可选 |
| 乙方单位（全称） | Counterparty | 从合同带出 |
| 合同约定付款次数 | Integer | 大于等于 1 |
| 本次付款为合同第几次付款 | Integer | 不得超过约定次数 |
| 累计已执行合同金额 | Money | 系统汇总历史已生效支出 |
| 未执行合同金额 | Money | 合同金额减累计执行金额 |
| 合同约定进度 | Decimal/String | 可配置为百分比或描述 |
| 实际进度 | Decimal/String | 必填 |
| 实际与合同比较（+-） | Decimal | 系统计算 |
| 付款方式 | Enum | 现金、支票、银行承兑汇票、其它 |
| 此次付款原因 | LongText | 必填 |
| 票据号码 | String | 按付款方式条件必填 |
| 工程合同保修期 | DateRange | 开始日期至结束日期 |
| 此次付款金额小写 | Money | 必填 |
| 此次付款金额大写 | String | 系统计算、只读 |
| 审批意见 | ApprovalTimeline | 系统生成 |

业务校验：

- 此次付款金额不得导致累计执行金额超过合同金额，除非有明确的超额审批策略。
- 预算余额、合同余额和付款进度必须在提交与最终付款前各校验一次。
- 关联合同、累计执行额和乙方单位以提交时快照进入归档。

## 4. 支出报销单

来源：[image9.png](../../assets/source-forms/image9.png)

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 编号 | String | 自动生成 |
| 部门 | Department | 默认当前部门 |
| 日期 | Date | 默认当前日期 |
| 经办人 | User | 默认当前用户 |
| 支付方式及金额 | Group | 页面分组标题 |
| 银行金额 | Money | 与其他支付金额汇总 |
| 现金金额 | Money | 与其他支付金额汇总 |
| 其他方式金额 | Money | 与其他支付金额汇总 |
| 收款人 | String/Counterparty | 银行付款时必填 |
| 账号 | BankAccount | 银行付款时必填、脱敏显示 |
| 开户行 | String/Bank | 银行付款时必填 |
| 内容 | LongText | 必填 |
| 支出金额 | Money | 必填 |
| 合计金额 | Money | 系统计算 |
| 合计金额大写 | String | 系统计算 |
| 审核金额 | Money | 财务节点填写 |
| 审核金额大写 | String | 系统计算 |
| 事由 | LongText | 必填 |
| 附件 | Attachment[] | 发票、凭证等 |
| 审批意见 | ApprovalTimeline | 系统生成 |

## 5. 银行支出申请单

来源：[image15.png](../../assets/source-forms/image15.png)

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 编号 | String | 自动生成 |
| 部门 | Department | 必填 |
| 日期 | Date | 自动默认 |
| 经办人 | User | 必填 |
| 用途 | LongText | 必填 |
| 收款单位 | Counterparty | 必填 |
| 金额 | Money | 必填 |
| 大写 | String | 系统计算 |
| 账号 | BankAccount | 必填、脱敏 |
| 开户行 | String/Bank | 必填 |
| 会计科目 | AccountingSubject | 财务节点必填 |
| 备注 | LongText | 可选 |
| 附件 | Attachment[] | 支付依据 |
| 审批意见 | ApprovalTimeline | 系统生成 |

## 6. 现金支出申请单

来源：[image16.png](../../assets/source-forms/image16.png)

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 编号 | String | 自动生成 |
| 部门 | Department | 必填 |
| 日期 | Date | 自动默认 |
| 经办人 | User | 必填 |
| 用途 | LongText | 必填 |
| 金额 | Money | 必填 |
| 大写 | String | 系统计算 |
| 领款人 | User/String | 必填 |
| 单据数 | Integer | 大于等于 0 |
| 会计科目 | AccountingSubject | 财务节点必填 |
| 附件 | Attachment[] | 支付依据 |
| 审批意见 | ApprovalTimeline | 系统生成 |

## 7. 借款申请单

来源：[image17.png](../../assets/source-forms/image17.png)、[image21.png](../../assets/source-forms/image21.png)

OA.docx 的“4.3 接口申请单”标题下实际截图为借款申请单，“4.6 借款申请单”再次出现同类截图。产品模型只保留一个借款表单，文档标题错误作为待确认项。

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 编号 | String | 自动生成 |
| 部门 | Department | 必填 |
| 日期 | Date | 自动默认 |
| 经办人 | User | 必填 |
| 用途 | LongText | 必填 |
| 领款人 | User/String | 必填 |
| 金额 | Money | 必填 |
| 大写 | String | 系统计算 |
| 会计科目 | AccountingSubject | 财务节点必填 |
| 备注 | LongText | image17 中存在，image21 中未显示；保留 |
| 附件 | Attachment[] | 必要材料 |
| 审批意见 | ApprovalTimeline | 系统生成 |

## 8. 应收、预收帐款退款批准单

来源：[image18.png](../../assets/source-forms/image18.png)

### 8.1 饭店业务部门填写项目

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 填写日期 | Date | 自动默认 |
| 业务部门 | Department | 必填 |
| 经办人 | User | 必填 |
| 退款金额 | Money | 必填 |
| 发生内容 | LongText | 必填 |
| 发生日期 | Date | 必填 |
| 发生单位 | Counterparty/String | 必填 |
| 收据或发票号 | String | 建议必填 |
| 实际付款单位 | Counterparty/String | 建议必填 |
| 预收款金额 | Money | 必填 |
| 消费金额 | Money | 必填 |
| 结余金额 | Money | 系统计算 |
| 预收款支付方式 | Enum | 现金、支票、汇款 |
| 大写金额 | String | 根据退款金额计算 |
| 申请退款说明 | LongText | 必填 |

### 8.2 饭店财务部填写项目

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 退款类别 | Enum | 现金、支票、汇款 |
| 接收退款单位 | Counterparty/String | 必填 |
| 接收退款开户银行 | String/Bank | 非现金必填 |
| 接收退款银行联号 | String | 按支付方式要求 |
| 相关附件 | Attachment[] | 财务凭证 |
| 会计科目 | AccountingSubject | 必填 |
| 审批意见 | ApprovalTimeline | 系统生成 |

## 9. 微信、支付宝退款批准单

来源：[image19.png](../../assets/source-forms/image19.png)

### 9.1 饭店业务部门填写项目

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 填写日期 | Date | 自动默认 |
| 业务部门 | Department | 必填 |
| 退款金额 | Money | 必填 |
| 发生内容 | LongText | 必填 |
| 发生日期 | Date | 必填 |
| 发生单位 | Counterparty/String | 必填 |
| 支付单号 | String | 必填 |
| 实际付款单位 | Counterparty/String | 必填 |
| 收据或发票号 | String | 建议必填 |
| 预收款金额 | Money | 必填 |
| 消费金额 | Money | 必填 |
| 结余金额 | Money | 系统计算 |
| 预收款支付方式 | Enum | 微信、支付宝、原表第三项文字待确认 |
| 大写金额 | String | 系统计算 |
| 申请退款说明 | LongText | 必填 |

### 9.2 饭店财务部填写项目

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 退款类别 | Enum | 微信、支付宝、原表第三项文字待确认 |
| 接收退款单位 | Counterparty/String | 必填 |
| 接收退款开户银行 | String/Bank | 必填 |
| 接收退款银行联号 | String | 按财务要求 |
| 相关附件 | Attachment[] | 财务凭证 |
| 会计科目 | AccountingSubject | 必填 |
| 审批意见 | ApprovalTimeline | 系统生成 |

创建人由系统审计字段记录。原截图未显示“经办人”，因此不额外加入业务表单。

## 10. 信用卡退款批准单

来源：[image20.png](../../assets/source-forms/image20.png)

### 10.1 饭店业务部门填写项目

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 填写日期 | Date | 自动默认 |
| 业务部门 | Department | 必填 |
| 收据或发票号 | String | 建议必填 |
| 信用卡发生日期 | Date | 必填 |
| 刷卡金额 | Money | 必填 |
| 房间号码 | String | 按业务场景必填 |
| 客人姓名 | String | 必填 |
| 信用卡卡号 | SensitiveString | 只保存必要尾号或加密，页面脱敏 |
| 实际消费金额 | Money | 必填 |
| 退卡金额 | Money | 必填，不得超过可退余额 |
| 身份证号码 | SensitiveString | 加密存储、脱敏展示 |
| 退款说明 | LongText | 必填 |

### 10.2 饭店财务部填写项目

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 退银行金额 | Money | 必填 |
| 金额大写 | String | 系统计算 |
| 信用卡手续费 | Money | 大于等于 0 |
| 退信用卡银行 | String/Bank | 必填 |
| 相关附件 | Attachment[] | 退款凭证 |
| 会计科目 | AccountingSubject | 必填 |
| 审批意见 | ApprovalTimeline | 系统生成 |
