import type { PortalAudienceType, PortalContentCategory, PortalContentStatus } from '@oa/contracts';
import type { PortalSeedData } from '../domain/portal.repository';
import type { PortalContent } from '../domain/portal.types';

interface ContentSeedInput {
  id: string;
  category: PortalContentCategory;
  title: string;
  summary: string;
  body: string;
  daysAgo: number;
  pinned?: boolean;
  requiresReceipt?: boolean;
  audienceType?: PortalAudienceType;
  audienceIds?: string[];
  attachments?: string[];
  status?: PortalContentStatus;
  publishInDays?: number;
}

function offsetDate(source: Date, days: number, hours = 0): Date {
  return new Date(source.getTime() + (days * 24 + hours) * 60 * 60 * 1000);
}

function createContent(now: Date, input: ContentSeedInput): PortalContent {
  const status = input.status ?? 'PUBLISHED';
  const publishedAt =
    status === 'DRAFT' ? null : offsetDate(now, input.publishInDays ?? -input.daysAgo);
  const createdAt = offsetDate(now, -Math.max(input.daysAgo + 2, 2));
  return {
    id: input.id,
    category: input.category,
    title: input.title,
    summary: input.summary,
    body: input.body,
    publisherId: 'user-office',
    publisherName: '办公室管理员',
    publisherDepartmentId: 'dept-office',
    publisherDepartmentName: '办公室',
    audienceType: input.audienceType ?? 'ALL',
    audienceIds: input.audienceIds ?? [],
    pinned: input.pinned ?? false,
    requiresReceipt: input.requiresReceipt ?? false,
    coverImageUrl: null,
    attachments: input.attachments ?? [],
    status,
    currentRevision: 1,
    publishedAt,
    offlineAt: null,
    withdrawnAt: status === 'WITHDRAWN' ? offsetDate(now, -1) : null,
    createdAt,
    updatedAt: status === 'DRAFT' ? createdAt : (publishedAt ?? createdAt),
  };
}

/** Builds stable demo identifiers with dates near the current development session. */
export function createPortalDevelopmentSeed(now = new Date()): PortalSeedData {
  const contents = [
    createContent(now, {
      id: 'portal-news-service-upgrade',
      category: 'COMPANY_NEWS',
      title: '酒店服务品质提升月正式启动',
      summary: '围绕宾客体验、跨部门协作和安全运营开展专项提升。',
      body: '<p>公司本月启动服务品质提升专项行动，各部门将围绕宾客触点、问题闭环和跨部门响应开展自查。</p><p>请各部门负责人结合工作实际安排改进任务。</p>',
      daysAgo: 1,
      pinned: true,
    }),
    createContent(now, {
      id: 'portal-news-summer-operation',
      category: 'COMPANY_NEWS',
      title: '暑期运营保障联合检查完成',
      summary: '工程、安保、客房和餐饮团队完成重点区域联合检查。',
      body: '<p>本次联合检查已形成问题台账，明确责任部门、完成时限和复核人。</p>',
      daysAgo: 4,
    }),
    createContent(now, {
      id: 'portal-notice-training',
      category: 'NOTICE',
      title: '关于开展 OA 流程规范培训的通知',
      summary: '本周五下午进行流程发起、审批意见和 A4 归档规范培训。',
      body: '<p>培训对象为各部门秘书、审批人和业务经办人。请提前准备一个实际单据场景。</p>',
      daysAgo: 0,
      pinned: true,
      requiresReceipt: true,
      attachments: ['OA流程操作规范.pdf'],
    }),
    createContent(now, {
      id: 'portal-notice-business-duty',
      category: 'NOTICE',
      title: '业务部周末值班安排',
      summary: '请业务部同事核对本周末值班班次与应急联系方式。',
      body: '<p>值班表已按班次更新，如需调整请于周四下班前向部门秘书反馈。</p>',
      daysAgo: 1,
      requiresReceipt: true,
      audienceType: 'DEPARTMENT',
      audienceIds: ['dept-business'],
    }),
    createContent(now, {
      id: 'portal-minutes-operation',
      category: 'MEETING_MINUTES',
      title: '本周经营协调会会议纪要',
      summary: '确认客流高峰保障、物资补库和合同付款时点。',
      body: '<p>会议确认三项重点任务：前厅排班优化、易耗品安全库存补齐、重点合同付款资料预审。</p>',
      daysAgo: 2,
      attachments: ['经营协调会任务清单.xlsx'],
    }),
    createContent(now, {
      id: 'portal-minutes-office',
      category: 'MEETING_MINUTES',
      title: '办公室晨会纪要',
      summary: '部署本周用印、公文归档和接待协调事项。',
      body: '<p>请相关经办人于每日下班前更新任务进展和异常情况。</p>',
      daysAgo: 1,
      audienceType: 'ROLE',
      audienceIds: ['OFFICE_REVIEWER', 'SEAL_MANAGER'],
    }),
    createContent(now, {
      id: 'portal-memo-energy',
      category: 'MEMO',
      title: '夏季节能工作备忘',
      summary: '空调、照明与设备用电须按运营时段执行巡检。',
      body: '<p>各部门下班前确认非必要用电设备已关闭，工程部每周汇总异常能耗数据。</p>',
      daysAgo: 3,
      requiresReceipt: true,
    }),
    createContent(now, {
      id: 'portal-memo-office-archive',
      category: 'MEMO',
      title: '归档材料补充提醒',
      summary: '本月已办结单据请在归档前核对附件和审批意见。',
      body: '<p>缺失合同扫描件、发票或执行记录的单据将退回经办人补齐。</p>',
      daysAgo: 2,
      audienceType: 'USER',
      audienceIds: ['user-office'],
    }),
    createContent(now, {
      id: 'portal-policy-expense',
      category: 'POLICY',
      title: '费用报销与付款材料管理规范',
      summary: '统一发票、合同、验收与付款申请的归集要求。',
      body: '<p>付款申请应与合同、验收或服务完成证明关联，金额与收款信息须由经办人复核。</p>',
      daysAgo: 6,
      requiresReceipt: true,
      attachments: ['费用材料清单.pdf'],
    }),
    createContent(now, {
      id: 'portal-policy-seal',
      category: 'POLICY',
      title: '印章证照使用管理制度',
      summary: '明确用印申请、外借、归还和异常登记要求。',
      body: '<p>印章外借必须记录领取人、预计归还时间和实际归还状态，不得以线下口头同意替代审批。</p>',
      daysAgo: 10,
    }),
    createContent(now, {
      id: 'portal-party-volunteer',
      category: 'PARTY_WORK',
      title: '党员志愿服务活动预告',
      summary: '本月组织社区共建志愿服务，现开放报名。',
      body: '<p>活动将开展环境整理与文明宣传，具体集合时间和工作分组将另行通知。</p>',
      daysAgo: 2,
    }),
    createContent(now, {
      id: 'portal-party-learning',
      category: 'PARTY_WORK',
      title: '七月理论学习资料清单',
      summary: '请相关人员按学习计划完成阅读并提交学习纪要。',
      body: '<p>学习资料已按主题整理，完成后请在支部会议上交流学习体会。</p>',
      daysAgo: 5,
      audienceType: 'ROLE',
      audienceIds: ['APPLICANT'],
    }),
    createContent(now, {
      id: 'portal-event-banquet-season',
      category: 'EVENT',
      title: '夏季宴会与会议接待统筹安排',
      summary: '发布未来两周重点宴会、会议活动及跨部门保障要求。',
      body: '<p>请宴会、餐饮、前厅、工程及安保团队按活动时间表完成场地、设备、菜单与交通保障确认。</p>',
      daysAgo: 1,
      pinned: true,
      requiresReceipt: true,
      attachments: ['宴会会议保障清单.xlsx'],
    }),
    createContent(now, {
      id: 'portal-demo-draft-service-standard',
      category: 'NOTICE',
      title: '宾客服务标准更新（草稿）',
      summary: '用于演示内容编辑、修订与发布流程。',
      body: '<p>该内容仍在办公室内部校对。</p>',
      daysAgo: 0,
      status: 'DRAFT',
      audienceType: 'DEPARTMENT',
      audienceIds: ['dept-office'],
    }),
    createContent(now, {
      id: 'portal-demo-scheduled-banquet',
      category: 'EVENT',
      title: '下周大型会议接待提示（定时发布）',
      summary: '用于演示按酒店本地时间定时发布。',
      body: '<p>请相关部门提前完成会场与客房联检。</p>',
      daysAgo: 0,
      status: 'SCHEDULED',
      publishInDays: 2,
    }),
    createContent(now, {
      id: 'portal-demo-withdrawn-policy',
      category: 'POLICY',
      title: '旧版接待物资领用说明（已撤回）',
      summary: '用于演示已撤回内容与审计记录。',
      body: '<p>该版本已由新版制度替代。</p>',
      daysAgo: 12,
      status: 'WITHDRAWN',
    }),
  ];

  return {
    contents,
    events: [
      {
        id: 'portal-event-operations-meeting',
        title: '经营协调会',
        startAt: offsetDate(now, 1, 1),
        endAt: offsetDate(now, 1, 2),
        allDay: false,
        location: '三楼第一会议室',
        kind: 'MEETING',
        displayOrder: 10,
        active: true,
      },
      {
        id: 'portal-event-contract-deadline',
        title: '月度合同归档截止',
        startAt: offsetDate(now, 3),
        endAt: offsetDate(now, 3, 8),
        allDay: true,
        location: null,
        kind: 'DEADLINE',
        displayOrder: 20,
        active: true,
      },
      {
        id: 'portal-event-training',
        title: 'OA 流程规范培训',
        startAt: offsetDate(now, 5, 2),
        endAt: offsetDate(now, 5, 4),
        allDay: false,
        location: '培训教室',
        kind: 'TRAINING',
        displayOrder: 30,
        active: true,
      },
      {
        id: 'portal-event-safety-check',
        title: '月度安全联合检查',
        startAt: offsetDate(now, 9, 1),
        endAt: offsetDate(now, 9, 5),
        allDay: false,
        location: '各运营区域',
        kind: 'EVENT',
        displayOrder: 40,
        active: true,
      },
    ],
    links: [
      {
        id: 'portal-link-workbench',
        title: '个人工作台',
        url: '/workbench',
        icon: 'LayoutDashboard',
        requiredPermissionCodes: [],
        displayOrder: 10,
        active: true,
      },
      {
        id: 'portal-link-contract',
        title: '合同与支出',
        url: '/contract',
        icon: 'FileSignature',
        requiredPermissionCodes: ['DOCUMENT_VIEW', 'CONTRACT_VIEW'],
        displayOrder: 20,
        active: true,
      },
      {
        id: 'portal-link-seal',
        title: '印章证照',
        url: '/seal',
        icon: 'Stamp',
        requiredPermissionCodes: ['DOCUMENT_VIEW', 'SEAL_VIEW'],
        displayOrder: 30,
        active: true,
      },
      {
        id: 'portal-link-supply',
        title: '物资申购领用',
        url: '/supply',
        icon: 'PackageOpen',
        requiredPermissionCodes: ['DOCUMENT_VIEW', 'SUPPLY_VIEW'],
        displayOrder: 40,
        active: true,
      },
      {
        id: 'portal-link-forms',
        title: '表单设计',
        url: '/system/forms',
        icon: 'PanelsTopLeft',
        requiredPermissionCodes: ['FORM_DESIGN_VIEW'],
        displayOrder: 50,
        active: true,
      },
      {
        id: 'portal-link-processes',
        title: '流程设计',
        url: '/system/processes',
        icon: 'Workflow',
        requiredPermissionCodes: ['PROCESS_DESIGN_VIEW'],
        displayOrder: 60,
        active: true,
      },
    ],
    widgets: [
      {
        ownerId: 'DEFAULT',
        widgetKey: 'CONTENT:COMPANY_NEWS',
        title: '公司新闻',
        displayOrder: 10,
        visible: true,
      },
      {
        ownerId: 'DEFAULT',
        widgetKey: 'CONTENT:NOTICE',
        title: '通知公告',
        displayOrder: 20,
        visible: true,
      },
      {
        ownerId: 'DEFAULT',
        widgetKey: 'CONTENT:MEETING_MINUTES',
        title: '会议纪要',
        displayOrder: 30,
        visible: true,
      },
      {
        ownerId: 'DEFAULT',
        widgetKey: 'CONTENT:MEMO',
        title: '备忘录',
        displayOrder: 40,
        visible: true,
      },
      {
        ownerId: 'DEFAULT',
        widgetKey: 'CONTENT:PARTY_WORK',
        title: '党群工作',
        displayOrder: 50,
        visible: true,
      },
      {
        ownerId: 'DEFAULT',
        widgetKey: 'CONTENT:POLICY',
        title: '规章制度',
        displayOrder: 60,
        visible: true,
      },
      {
        ownerId: 'DEFAULT',
        widgetKey: 'CONTENT:EVENT',
        title: '宴会会议',
        displayOrder: 65,
        visible: true,
      },
      {
        ownerId: 'DEFAULT',
        widgetKey: 'WORK_SUMMARY',
        title: '我的工作',
        displayOrder: 70,
        visible: true,
      },
      {
        ownerId: 'DEFAULT',
        widgetKey: 'CALENDAR',
        title: '工作日历',
        displayOrder: 80,
        visible: true,
      },
      {
        ownerId: 'DEFAULT',
        widgetKey: 'QUICK_LINKS',
        title: '常用入口',
        displayOrder: 90,
        visible: true,
      },
    ],
  };
}
