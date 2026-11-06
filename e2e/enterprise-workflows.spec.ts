import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  apiBaseUrl,
  apiLogin,
  authorizedGet,
  authorizedPost,
  loginThroughUi,
  type ApiSession,
} from './advanced-fixtures';

const credentials = {
  username: 'applicant',
  password: 'Demo123!',
};

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('账号').fill(credentials.username);
  await page.getByLabel('密码').fill(credentials.password);
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('.ui-app-header')).toBeVisible();
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('shows the company portal after login', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '公司门户', exact: true })).toBeVisible();
  await expect(page.getByText('待我审批')).toBeVisible();
  await expect(page.getByText('待阅信息')).toBeVisible();
  await expect(page.getByText('常用链接')).toBeVisible();
  await expect(page.locator('.portal-section-panel').first()).toBeVisible();
  await expectNoPageOverflow(page);
});

test('shows the personal workbench task views', async ({ page }, testInfo) => {
  await page.goto('/workbench');
  await expect(page.getByRole('heading', { name: /工作空间$/ })).toBeVisible();
  // 电脑用页签切换工作箱，手机用下拉选择（同一份数据、同一套筛选）
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('combobox', { name: '选择工作箱' })).toBeVisible();
  } else {
    await expect(page.getByRole('tab', { name: '我发起的' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /待阅/ })).toBeVisible();
  }
  await expectNoPageOverflow(page);
  // 审批中心的待办/已办页签只对有审批权限的账号开放，由 navigation-responsive 用例覆盖
});

test('saves a complete contract request draft', async ({ page }) => {
  await page.goto('/contract/requests/new');
  // 请示批复按需求隐藏大标题，保留所属业务与表单
  await expect(page.locator('.page-header h1')).toHaveCount(0);
  await expect(page.getByLabel('请示日期')).toHaveValue(/\d{4}\/\d{2}\/\d{2}/);

  const title = `企业验收请示-${test.info().project.name}-${Date.now()}`;
  await page.getByLabel('请示题目').fill(title);
  await page
    .getByLabel('请示内容')
    .fill('用于验证企业级合同请示表单的草稿保存、编号生成与响应式布局。');
  await page.getByRole('button', { name: '保存草稿' }).click();

  await expect(page).toHaveURL(/\/contract\/requests\/[0-9a-f-]+\/edit$/);
  await expect(page.getByText('草稿', { exact: true })).toBeVisible();
  // 编号：部门简称 + 日期 + 「-」+ 流水号，例如 YWB20261011-001
  await expect(page.getByText(/[A-Z]{2,8}\d{8}-\d{3}/).first()).toBeVisible();
  await expectNoPageOverflow(page);
});

test('keeps the license borrow flow under the certificate menu', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', '手机端菜单为抽屉，桌面已覆盖菜单归属断言');
  await page.goto('/seal/licenses');
  await expect(page.getByRole('heading', { name: '证照申请', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '新建借用申请' }).click();
  await expect(page).toHaveURL(/\/seal\/borrow\/new$/);

  // 默认不外带：只需证照种类、使用日期与申请内容
  await page.getByLabel('使用日期').fill('2026-10-12');
  await page.getByLabel('申请内容').fill('验证证照借用流程的菜单归属。');
  await page.locator('.el-form-item').filter({ hasText: '证照种类' }).first().locator('.el-select__wrapper').click();
  await page.getByLabel('证照种类').pressSequentially('营业执照');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page).toHaveURL(/\/seal\/borrow\/[0-9a-f-]+\/edit$/);

  // 左侧菜单应停留在「证照申请」，返回也回到证照列表
  await expect(page.locator('.el-menu-item.is-active').first()).toContainText('证照申请');
  await page.getByRole('button', { name: '返回台账' }).click();
  await expect(page).toHaveURL(/\/seal\/licenses$/);
  await expect(page.getByRole('heading', { name: '证照申请', exact: true })).toBeVisible();
  await expectNoPageOverflow(page);
});

test('uploads an attachment on the contract approval draft', async ({ page }, testInfo) => {
  await page.goto('/contract/approvals/new');
  await page.getByLabel('合同/协议名称').fill(`合同附件上传-${testInfo.project.name}-${Date.now()}`);
  await page.getByLabel('合同/协议对方单位全称').fill('附件验证供应商');
  await page.getByLabel('合同/协议内容及理由').fill('验证合同审批附件直接上传与编号。');

  const fileName = `合同正文-${Date.now()}.pdf`;
  await page.getByLabel('选择附件文件').setInputFiles({
    name: fileName,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 contract approval attachment e2e'),
  });
  await expect(page.getByLabel('附件清单').getByText(fileName)).toBeVisible();

  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page).toHaveURL(/\/contract\/approvals\/[0-9a-f-]+\/edit$/);
  // 编号：签约部门简称 + 日期 + 「-」+ 流水号（签约部门默认当前部门）
  await expect(page.getByText(/[A-Z]{2,8}\d{8}-\d{3}/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('附件清单').getByText(fileName)).toBeVisible();
  await expectNoPageOverflow(page);
});

test('uploads and downloads a contract request attachment', async ({ page }, testInfo) => {
  await page.goto('/contract/requests/new');
  await page.getByLabel('请示题目').fill(`附件上传请示-${testInfo.project.name}-${Date.now()}`);
  await page.getByLabel('请示内容').fill('用于验证请示附件直接上传、保存后下载。');

  const fileName = `报价单-${Date.now()}.pdf`;
  await page.getByLabel('选择附件文件').setInputFiles({
    name: fileName,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 attachment upload e2e'),
  });
  const attachmentList = page.getByLabel('附件清单');
  await expect(attachmentList.getByText(fileName)).toBeVisible();
  await expect(page.getByRole('button', { name: `下载${fileName}` })).toBeVisible();

  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page).toHaveURL(/\/contract\/requests\/[0-9a-f-]+\/edit$/);

  // 保存后重新加载，附件仍随单据保留
  await page.reload();
  await expect(attachmentList.getByText(fileName)).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: `下载${fileName}` }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(fileName);
  await expectNoPageOverflow(page);
});

test('creates a purchase approval with the simplified fields', async ({ page }, testInfo) => {
  // 办公室（系统管理员）拥有采购发起权限
  await loginThroughUi(page, 'office');
  await page.goto('/purchase/requests/new');
  await expect(page.getByRole('heading', { name: '新建采购审批' })).toBeVisible();
  // 采购金额、乙方单位、乙方联系人、联系电话、付款方式已取消
  for (const removed of ['采购金额', '乙方单位', '乙方联系人', '联系电话', '付款方式']) {
    await expect(page.getByText(removed, { exact: true })).toHaveCount(0);
  }

  await page.getByLabel('采购名称').fill(`采购明细验证-${testInfo.project.name}-${Date.now()}`);
  await page.getByLabel('品名').fill('客房雨伞');
  await page.getByLabel('订购数量').fill('20');
  await page.getByLabel('单位').fill('把');
  await page.getByRole('button', { name: '保存草稿' }).click();

  await expect(page).toHaveURL(/\/purchase\/requests\/[0-9a-f-]+\/edit$/);
  // 采购单号：部门简称 + 日期 + 「-」+ 流水号，例如 YWB20261011-001
  await expect(page.getByText(/[A-Z]{2,8}\d{8}-\d{3}/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('品名')).toHaveValue('客房雨伞');
  await expect(page.getByLabel('单位')).toHaveValue('把');
  await expectNoPageOverflow(page);
});

const formCases = [
  {
    path: '/contract/approvals/new',
    heading: '新建合同/协议审批',
    fields: ['关联请示', '签约部门', '合同/协议名称', '合同金额', '用印', '合同/协议对方单位全称'],
  },
  {
    path: '/contract/payments/new',
    heading: '新建合同/协议支出申请',
    fields: ['已审批合同', '预算金额', '合同约定付款次数', '付款方式', '此次付款金额（小写）'],
  },
  {
    path: '/seal/borrow/new',
    heading: '证照借用申请',
    // 证照种类在最前；计划归还日期/陪同人/前往地点只有选择「外带=是」才出现
    fields: ['证照种类', '使用日期', '是否外带', '报送单位', '申请内容'],
  },
  {
    path: '/seal/use/new',
    heading: '印章使用申请',
    fields: ['使用日期', '用途', '用章类别及数量', '申请内容'],
  },
  {
    path: '/supply/purchases/new',
    heading: '物资申购单',
    fields: ['申购人', '申购部门', '申购日期', /品名/, /申购数量/, /参考单价/],
  },
  {
    path: '/supply/requisitions/new',
    heading: '物品领用申请单',
    fields: ['申请人', '部门', '填写日期', '联系人', '货物编号', /请领数量/, /用途/],
  },
  {
    path: '/food-purchase/requests/new',
    heading: '新建食材采购',
    fields: ['单据编号', '申请部门', '申请人', '申请日期', '班组', '品类', '品名', '数量', '单位', '要求', '单价', '备注'],
  },
  {
    path: '/material-loss/requests/new',
    heading: '新建物资报损',
    fields: ['报损日期', '报损原因及说明', '品名', '数量', '单位', '单价', '备注'],
  },
  {
    path: '/order-circulation/requests/new',
    heading: '新建订单流转',
    fields: ['主题', '主要内容', '抄送人'],
  },
] as const;

for (const formCase of formCases) {
  test(`${formCase.heading} exposes required enterprise fields`, async ({ page }) => {
    await page.goto(formCase.path);
    await expect(page.getByRole('heading', { name: formCase.heading })).toBeVisible();
    for (const field of formCase.fields) {
      const label =
        typeof field === 'string' ? page.getByText(field, { exact: true }) : page.getByText(field);
      await expect(label.first()).toBeVisible();
    }
    await expectNoPageOverflow(page);
  });
}

test('creates a food purchase with pinyin initials and an optional price', async ({ page }) => {
  await page.goto('/food-purchase/requests/new');
  await expect(page.getByRole('heading', { name: '新建食材采购' })).toBeVisible();

  const row = page.getByTestId('food-item-row-0');
  // 品类与品名都支持拼音首字母检索
  await row.getByPlaceholder('如：蔬菜类').fill('rql');
  await page.locator('.el-autocomplete-suggestion li:visible').filter({ hasText: '肉禽类' }).first().click();
  await row.getByPlaceholder('如：五花肉').fill('wr');
  await page.locator('.el-autocomplete-suggestion li:visible').filter({ hasText: '五花肉' }).first().click();
  await page.getByLabel('班组').fill('中厨房');
  await row.getByLabel('规格').fill('散装');
  await row.getByLabel('数量').fill('5');
  await row.getByLabel('单位').fill('斤');
  await row.getByLabel('要求').fill('新鲜、切块');
  // 发起人价格非必填
  await page.getByRole('button', { name: '保存草稿' }).click();

  await expect(page).toHaveURL(/\/food-purchase\/requests\/[0-9a-f-]+\/edit$/);
  await expect(page.getByText(/[A-Z]{2,8}\d{8}-\d{3}/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('班组')).toHaveValue('中厨房');
  const reloaded = page.getByTestId('food-item-row-0');
  await expect(reloaded.getByPlaceholder('如：五花肉')).toHaveValue('五花肉');
  await expect(reloaded.getByLabel('数量')).toHaveValue('5');
  await expect(reloaded.getByLabel('要求')).toHaveValue('新鲜、切块');
  await expect(reloaded.getByLabel('单价')).toHaveValue('');
  await expectNoPageOverflow(page);
});

test('lets the approving leader adjust food purchase items', async ({ page, request }, testInfo) => {
  const applicant = await apiLogin(request, 'applicant');
  const itemName = `五花肉${Date.now()}`;
  const created = await authorizedPost<{ data: { id: string } }>(
    request,
    applicant,
    '/food-purchases',
    {
      applicationDate: '2026-10-28',
      items: [
        {
          category: '肉禽类',
          name: itemName,
          specification: '散装',
          unit: '斤',
          quantity: 5,
        },
      ],
      attachments: [],
    },
  );
  await authorizedPost(
    request,
    applicant,
    `/workflow/documents/${created.data.id}/submit`,
    { requestId: randomUUID() },
  );

  await loginThroughUi(page, 'manager');
  // 待我审批在审批中心（个人工作台默认展示「我发起的」）
  await page.goto('/approval');
  if (testInfo.project.name === 'mobile') {
    // 手机端筛选收在底部弹层里
    await page.getByRole('button', { name: /^筛选/ }).click();
    const filterDrawer = page.locator('.el-drawer').filter({ hasText: '筛选工作台' });
    await filterDrawer.getByPlaceholder('搜索标题、发起人或部门').fill(itemName);
    await page.getByRole('button', { name: '应用', exact: true }).click();
  } else {
    await page.getByPlaceholder('搜索标题、发起人或部门').fill(itemName);
  }
  const handle = page
    .locator('[data-testid^="workbench-task-open-"]')
    .filter({ hasText: itemName });
  await expect(handle.first()).toBeVisible();
  await handle.first().click();

  const row = page.getByTestId('food-approver-item-0');
  await expect(row).toBeVisible();
  await row.getByLabel('数量').fill('3');
  await row.getByLabel('单价').fill('28');
  await page.getByRole('button', { name: '保存明细调整' }).click();
  await expect(page.getByText('采购明细已更新')).toBeVisible();

  const updatedRow = page.getByTestId('food-approver-item-0');
  await expect(updatedRow.getByLabel('数量')).toHaveValue('3');
  await expect(updatedRow.getByLabel('单价')).toHaveValue(/28(\.00)?/);
  await expect(page.getByText('¥84.00', { exact: true }).first()).toBeVisible();
});

test('shows the return date only when the official seal is taken out', async ({ page }) => {
  await page.goto('/seal/use/new');
  await expect(page.getByLabel('归还日期')).toHaveCount(0);

  const takeoutGroup = page
    .locator('.el-form-item')
    .filter({ hasText: '公章外带' })
    .first();
  await takeoutGroup.getByText('是', { exact: true }).click();
  await expect(page.getByLabel('归还日期')).toBeVisible();

  await takeoutGroup.getByText('否', { exact: true }).click();
  await expect(page.getByLabel('归还日期')).toHaveCount(0);
});

test('creates a material loss draft', async ({ page }) => {
  await page.goto('/material-loss/requests/new');
  await expect(page.getByRole('heading', { name: '新建物资报损' })).toBeVisible();

  await page.getByLabel('报损原因及说明').fill('存放过期，无法继续使用');
  const row = page.getByTestId('loss-item-row-0');
  await row.getByLabel('品名').fill('客房毛巾');
  await row.getByLabel('规格').fill('白色标准');
  await row.getByLabel('数量').fill('6');
  await row.getByLabel('单位').fill('条');
  await row.getByLabel('单价').fill('12');
  await page.getByRole('button', { name: '保存草稿' }).click();

  await expect(page).toHaveURL(/\/material-loss\/requests\/[0-9a-f-]+\/edit$/);
  await expect(page.getByText(/[A-Z]{2,8}\d{8}-\d{3}/).first()).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('loss-item-row-0').getByLabel('品名')).toHaveValue('客房毛巾');
  await expectNoPageOverflow(page);
});

test('creates an order circulation draft with a cc recipient', async ({ page }, testInfo) => {
  await page.goto('/order-circulation/requests/new');
  await expect(page.getByRole('heading', { name: '新建订单流转' })).toBeVisible();

  const subject = `订单流转-${testInfo.project.name}-${Date.now()}`;
  await page.getByLabel('主题').fill(subject);
  await page.getByLabel('主要内容').fill('详见附件订单明细，请抄送知悉。');
  await page.getByTestId('order-cc-select').click();
  // 发起人本人不在可抄送列表中
  await page.getByRole('option', { name: /财务审核人/ }).first().click();
  await page.getByRole('button', { name: '保存草稿' }).click();

  await expect(page).toHaveURL(/\/order-circulation\/requests\/[0-9a-f-]+\/edit$/);
  await page.reload();
  await expect(page.getByLabel('主题')).toHaveValue(subject);
  await expect(page.getByText('财务审核人 · 财务部').first()).toBeVisible();
  await expectNoPageOverflow(page);
});

test('copies an order circulation to the selected recipient', async ({ request }) => {
  const [applicant, finance] = await Promise.all([
    apiLogin(request, 'applicant'),
    apiLogin(request, 'finance'),
  ]);
  const recipients = await authorizedGet<Array<{ id: string; username: string }>>(
    request,
    applicant,
    '/order-circulations/cc-recipients',
  );
  const financeRecipient = recipients.find((user) => user.username === 'finance');
  expect(financeRecipient).toBeTruthy();

  const created = await authorizedPost<{ data: { id: string } }>(
    request,
    applicant,
    '/order-circulations',
    {
      applicationDate: '2026-10-28',
      subject: `订单流转抄送-${Date.now()}`,
      content: '具体内容见附件。',
      ccUserIds: [financeRecipient!.id],
      attachments: [],
    },
  );
  await authorizedPost(
    request,
    applicant,
    `/workflow/documents/${created.data.id}/submit`,
    { requestId: randomUUID() },
  );
  const copies = await authorizedPost<{ deliveries: Array<{ recipientId: string }> }>(
    request,
    applicant,
    `/workflow/documents/${created.data.id}/copies`,
    { recipientIds: [financeRecipient!.id] },
  );
  expect(copies.deliveries).toHaveLength(1);

  const copiedBox = await authorizedGet<{ items: Array<{ documentId: string }> }>(
    request,
    finance,
    '/workbench/items?box=COPIED&page=1&pageSize=100',
  );
  expect(copiedBox.items.some((item) => item.documentId === created.data.id)).toBe(true);
});

test('routes a request through the office department choice', async ({ request }) => {
  const [applicant, manager, office, finance, execpre] = await Promise.all([
    apiLogin(request, 'applicant'),
    apiLogin(request, 'manager'),
    apiLogin(request, 'office'),
    apiLogin(request, 'finance'),
    apiLogin(request, 'execpre'),
  ]);
  const created = await authorizedPost<{ data: { id: string } }>(
    request,
    applicant,
    '/contracts/requests',
    {
      title: `办公室选择部门-${Date.now()}`,
      requestedAt: '2026-10-28',
      amountCents: null,
      content: '验证办公室勾选下一步部门后直接送主管领导。',
      attachments: [],
    },
  );
  const documentId = created.data.id;
  await authorizedPost(
    request,
    applicant,
    `/workflow/documents/${documentId}/submit`,
    { requestId: randomUUID() },
  );

  const managerTask = await pendingTaskOf(request, manager, documentId);
  await authorizedPost(
    request,
    manager,
    `/workflow/tasks/${managerTask.id}/approve`,
    { requestId: randomUUID(), comment: '同意上报' },
  );

  const officeTask = await pendingTaskOf(request, office, documentId);
  expect(officeTask.nodeKind).toBe('CHOICE');
  expect(officeTask.choiceOptions.map((option) => option.name)).not.toContain('外部律师审核');

  // 办公室必须先勾选下一步部门，不能直接同意跳过部门审核
  const missingChoice = await request.post(
    `${apiBaseUrl}/workflow/tasks/${officeTask.id}/approve`,
    {
      headers: { Authorization: `Bearer ${office.accessToken}` },
      data: { requestId: randomUUID(), comment: '未选部门' },
    },
  );
  expect(missingChoice.status()).toBe(422);
  expect((await missingChoice.json()).code).toBe('WORKFLOW_CHOICE_REQUIRED');

  const financeOption = officeTask.choiceOptions.find(
    (option) => option.name === '财务部审核',
  );
  expect(financeOption).toBeTruthy();
  await authorizedPost(
    request,
    office,
    `/workflow/tasks/${officeTask.id}/approve`,
    {
      requestId: randomUUID(),
      comment: '请财务部审核',
      choices: [financeOption!.id],
    },
  );

  const financeTask = await pendingTaskOf(request, finance, documentId);
  await authorizedPost(
    request,
    finance,
    `/workflow/tasks/${financeTask.id}/approve`,
    { requestId: randomUUID(), comment: '财务部无意见' },
  );

  const execTask = await pendingTaskOf(request, execpre, documentId);
  expect(execTask.processNodeName).toBe('主管领导');
  await authorizedPost(
    request,
    execpre,
    `/workflow/tasks/${execTask.id}/approve`,
    { requestId: randomUUID(), comment: '同意' },
  );
  const overview = await authorizedGet<{ document: { status: string } }>(
    request,
    applicant,
    `/workflow/documents/${documentId}/overview`,
  );
  expect(overview.document.status).toBe('APPROVED');
});

interface PendingTask {
  id: string;
  documentId: string;
  nodeKind: 'APPROVAL' | 'CHOICE';
  processNodeName: string | null;
  choiceOptions: Array<{ id: string; name: string }>;
}

async function pendingTaskOf(
  request: APIRequestContext,
  session: ApiSession,
  documentId: string,
): Promise<PendingTask> {
  const tasks = await authorizedGet<PendingTask[]>(request, session, '/workflow/tasks');
  const task = tasks.find((candidate) => candidate.documentId === documentId);
  expect(task, `pending task for ${documentId}`).toBeTruthy();
  return task!;
}
