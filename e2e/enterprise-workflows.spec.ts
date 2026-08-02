import { expect, test, type Page } from '@playwright/test';

const credentials = {
  username: 'applicant',
  password: 'Demo123!',
};

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('账号').fill(credentials.username);
  await page.getByLabel('密码').fill(credentials.password);
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await expect(page).toHaveURL(/\/$/);
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
  await expect(page.getByRole('heading', { name: '东方饭店公司门户' })).toBeVisible();
  await expect(page.getByText('待我审批')).toBeVisible();
  await expect(page.getByText('待阅信息')).toBeVisible();
  await expect(page.getByText('快捷发起')).toBeVisible();
  await expect(page.getByText('常用链接')).toBeVisible();
  await expectNoPageOverflow(page);
});

test('shows the personal workbench task views', async ({ page }) => {
  await page.goto('/workbench');
  await expect(page.getByRole('heading', { name: /工作空间$/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /待办/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: '已办' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '我发起的' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /待阅/ })).toBeVisible();
  await expectNoPageOverflow(page);
});

test('saves a complete contract request draft', async ({ page }) => {
  await page.goto('/contract/requests/new');
  await expect(page.getByRole('heading', { name: '新建合同/支出请示' })).toBeVisible();

  const title = `企业验收请示-${test.info().project.name}-${Date.now()}`;
  await page.getByLabel('请示题目').fill(title);
  await page
    .getByLabel('请示内容')
    .fill('用于验证企业级合同请示表单的草稿保存、编号生成与响应式布局。');
  await page.getByRole('button', { name: '保存草稿' }).click();

  await expect(page).toHaveURL(/\/contract\/requests\/[0-9a-f-]+\/edit$/);
  await expect(page.getByText('草稿', { exact: true })).toBeVisible();
  await expect(page.getByText(/CONTRACT-REQUEST-/).first()).toBeVisible();
  await expectNoPageOverflow(page);
});

const formCases = [
  {
    path: '/contract/approvals/new',
    heading: '新建合同/协议审批',
    fields: ['关联已审批请示', '签约部门', '合同/协议名称', '合同金额', '合同/协议对方单位全称'],
  },
  {
    path: '/contract/payments/new',
    heading: '新建合同/协议支出申请',
    fields: ['已审批合同', '预算金额', '合同约定付款次数', '付款方式', '此次付款金额（小写）'],
  },
  {
    path: '/seal/borrow/new',
    heading: '印章证照外借申请',
    fields: ['使用日期', '计划归还日期', '陪同人', '前往地点', '印章证照名称', '申请内容'],
  },
  {
    path: '/seal/use/new',
    heading: '印章证照使用申请',
    fields: ['使用日期', '用途', '印章证照名称', '申请内容'],
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
