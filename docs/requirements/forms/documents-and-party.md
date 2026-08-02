# 公文、信息与党群表单

## 1. 非合同/支出类请示报告

来源：[image23.png](../../assets/source-forms/image23.png)

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 请示题目 | String | 必填 |
| 申请部门 | Department | 必填 |
| 拟稿人 | User | 必填 |
| 请示类型 | DictSelect | 必填 |
| 拟稿时间 | DateTime | 自动默认 |
| 请示字号 | DocumentNumber | 按编号规则生成或归档节点补录 |
| 请示内容 | LongText | 必填 |
| 附件 | Attachment[] | 原表要求正文另行上传一份，并添加其他必要附件 |
| 审批意见 | ApprovalTimeline | 系统生成 |

## 2. 发文

来源：[image24.png](../../assets/source-forms/image24.png)

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 发文题目 | String | 必填 |
| 拟稿部门 | Department | 必填 |
| 拟稿人 | User | 必填 |
| 发文类型 | DictSelect | 必填 |
| 拟稿时间 | DateTime | 自动默认 |
| 发文字号 | DocumentNumber | 按规则生成 |
| 发文简介 | LongText | 必填 |
| 附件 | Attachment[] | 正文及相关附件 |
| 审批意见 | ApprovalTimeline | 系统生成 |

发文完成后应进入编号、签发、发布范围、收件回执和归档环节。

## 3. 收文

来源：[image25.png](../../assets/source-forms/image25.png)

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 收文题目 | String | 必填 |
| 收文字号 | String | 必填 |
| 来文单位 | Counterparty/String | 必填 |
| 拟稿部门 | Department | 原表名称如此；产品上建议改为承办/登记部门，待确认 |
| 拟稿人 | User | 原表名称如此；产品上建议改为登记人，待确认 |
| 收文类型 | DictSelect | 必填 |
| 拟稿时间 | DateTime | 原表名称如此；产品上建议改为登记时间，待确认 |
| 收文简介 | LongText | 必填 |
| 附件 | Attachment[] | 来文正文及附件 |
| 审批意见 | ApprovalTimeline | 系统生成 |

收文需要支持传阅范围、阅知回执、承办部门、办理期限和催办。

## 4. 三重一大决议流程

来源：[image26.png](../../assets/source-forms/image26.png)

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 决议题目 | String | 必填 |
| 编号 | DocumentNumber | 自动生成 |
| 决议时间 | DateTime | 必填 |
| 发起部门 | Department | 必填 |
| 发起人 | User | 必填 |
| 决议类型 | DictSelect | 必填 |
| 拟稿时间 | DateTime | 自动默认 |
| 简介 | LongText | 必填 |
| 附件 | Attachment[] | 议题材料、会议纪要、决议文件 |
| 审批意见 | ApprovalTimeline | 系统生成 |

流程完成时由党办秘书选择执行部门，并建立执行任务或启动合同/支出子流程。决议本身与执行流程分别归档，但相互可追溯。

## 5. 信息发布

源文档未提供独立表单截图，但明确了以下栏目：

- 会议纪要：周会纪要、晨会纪要
- 备忘录
- 通知公告
- 规章制度
- 公司新闻
- 党群工作
- 宴会会议：宴会、会议活动预告与跨部门保障信息；EO 业务单据本身仍归会议宴会表单模块

统一内容模型：

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| 标题 | String | 必填 |
| 栏目 | ContentCategory | 必填 |
| 摘要 | String | 列表和门户展示 |
| 正文 | RichText | 必填，进行 XSS 清洗 |
| 封面图 | Image | 公司新闻等栏目使用 |
| 发布人/部门 | User/Department | 自动记录 |
| 查看范围 | AudienceRule | 全员、部门、角色或指定人员 |
| 是否置顶 | Boolean | 有权限者设置 |
| 发布时间 | DateTime | 立即或定时 |
| 下线时间 | DateTime | 可选 |
| 附件 | Attachment[] | 可选 |
| 阅读回执 | Boolean | 可要求确认已读 |
| 内容状态 | Enum | 草稿、定时发布、已发布、已撤回 |
| 当前修订 | Integer | 每次编辑或状态变化递增，并保留不可变快照 |

源需求说明这些信息不需要审批、发起后直接发布。企业级实现仍应提供栏目发布权限、撤回、修订版本和审计。

## 6. 党群复用表单

- 党群行政印章证照使用复用“印章证照使用申请”字段，但绑定独立流程版本。
- 党委发文复用“发文”字段，但使用党委字号、发布范围和党群归档规则。
- 党群收文文件传阅复用“收文”字段，但使用党委角色和阅办范围。

复用意味着引用同一个可演进的表单模板或从模板派生，不复制粘贴代码。业务规则和流程版本仍可独立。
