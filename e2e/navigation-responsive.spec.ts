import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoPageOverflow, loginThroughUi } from './advanced-fixtures';

const keyNavigationLabels = ['审批中心', '发起申请', '合同与支出', '行政印章', '物资管理'] as const;

const processStartLabels = [
  '合同/支出请示',
  '合同审批',
  '合同付款',
  '印章证照外借',
  '印章证照使用',
  '物资申购',
  '物资领用',
] as const;

const mobileBusinessPages = [
  { path: '/contract', heading: '合同与支出管理' },
  { path: '/seal', heading: '行政印章' },
  { path: '/supply', heading: '物资申购与领用' },
] as const;

test.describe('enterprise navigation and responsive process entry', () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await loginThroughUi(page, 'office');
  });

  test('office can see approval, process starts, and all three business modules', async ({
    page,
  }, testInfo) => {
    const navigation = await visibleSystemNavigation(page, testInfo.project.name);
    for (const label of keyNavigationLabels) {
      await expect(navigation.getByText(label, { exact: true })).toBeVisible();
    }

    await page.goto('/workbench?tab=pending');
    await expect(page.getByRole('heading', { name: '待我审批', exact: true })).toBeVisible();
    await expect(page.locator('.enterprise-header__title').getByText('审批中心')).toBeVisible();

    await page.goto('/start');
    await expect(page.getByRole('heading', { name: '发起申请', exact: true })).toBeVisible();
    await expect(page.getByTestId('process-start-item')).toHaveCount(7);
    for (const label of processStartLabels) {
      await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
    }
    await expectNoPageOverflow(page);
  });

  test('IAM assignment columns stay visible at the medium desktop boundary', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'This assertion targets the desktop shell.');
    await page.setViewportSize({ width: 1134, height: 884 });
    await page.goto('/system/iam');
    await page.getByRole('tab', { name: '用户授权', exact: true }).click();

    const membershipTable = page.locator('.iam-membership-table');
    const roleTable = page.locator('.iam-role-assignment-table');
    await expect(membershipTable).toHaveCount(1);
    await expect(roleTable).toHaveCount(1);
    await expectTableColumnsInside(membershipTable, [
      '部门',
      '岗位',
      '主部门',
      '部门负责人',
      '启用',
    ]);
    await expectTableColumnsInside(roleTable, ['角色', '数据范围', '范围部门']);
    await expectNoPageOverflow(page);
  });

  test('IAM assignments stay operable on a phone without page overflow', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'This assertion targets the mobile shell.');
    await page.goto('/system/iam');
    await page.getByRole('tab', { name: '用户授权', exact: true }).click();

    const userLayout = page.locator('.iam-user-layout');
    await expect(userLayout).toBeVisible();
    const gridTrackCount = await userLayout.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,
    );
    expect(gridTrackCount).toBe(1);
    await expectHorizontalTableScroll(page.locator('.iam-membership-table'));
    await expectHorizontalTableScroll(page.locator('.iam-role-assignment-table'));
    await expectNoPageOverflow(page);
  });

  test('mobile navigation stays usable and the A4 preview fits the viewport', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'This assertion targets the 390 x 844 project.');

    const bottomNavigation = page.getByRole('navigation', { name: '手机端主导航' });
    await expect(bottomNavigation).toBeVisible();
    for (const label of ['公司门户', '审批中心', '发起申请', '个人工作台', '更多']) {
      await expect(
        bottomNavigation.getByRole('button', { name: label, exact: true }),
      ).toBeVisible();
    }
    await expectNoPageOverflow(page);

    await page.goto('/system/forms');
    await expect(page.getByRole('heading', { name: 'A4 审批表单设计' })).toBeVisible();
    const fitWidthButton = page.getByRole('button', { name: '适应宽度' });
    await expect(fitWidthButton).toBeVisible();
    await fitWidthButton.click();

    const stage = page.locator('.a4-stage');
    const sheet = stage.locator('.a4-sheet');
    await expect(sheet).toBeVisible();
    await expect.poll(async () => previewFitsStage(stage, sheet)).toBe(true);
    await expectNoPageOverflow(page);
  });

  test('320px mobile layout keeps process entry and A4 designer within the viewport', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'A single project covers the 320px boundary.');
    await page.setViewportSize({ width: 320, height: 740 });

    const bottomNavigation = page.getByRole('navigation', { name: '手机端主导航' });
    await expect(bottomNavigation).toBeVisible();
    await expect(
      bottomNavigation.getByRole('button', { name: '审批中心', exact: true }),
    ).toBeVisible();
    await expect(
      bottomNavigation.getByRole('button', { name: '发起申请', exact: true }),
    ).toBeVisible();
    await expectNoPageOverflow(page);

    await bottomNavigation.getByRole('button', { name: '审批中心', exact: true }).click();
    await expect(page.getByRole('heading', { name: '待我审批', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: '选择工作箱' })).toBeVisible();
    await expectNoPageOverflow(page);

    for (const businessPage of mobileBusinessPages) {
      await page.goto(businessPage.path);
      await expect(
        page.getByRole('heading', { name: businessPage.heading, exact: true }),
      ).toBeVisible();
      await expectNoPageOverflow(page);
    }

    await page.goto('/system/forms');
    await expect(page.getByRole('heading', { name: 'A4 审批表单设计' })).toBeVisible();
    await expect(page.locator('.form-designer-mobile-tabs')).toBeVisible();
    await expect(page.locator('.form-canvas-workspace')).toBeVisible();
    await expect(page.locator('.form-designer-shell > .definition-nav')).toBeHidden();
    await page.getByRole('button', { name: '适应宽度' }).click();

    const stage = page.locator('.a4-stage');
    const sheet = stage.locator('.a4-sheet');
    await expect.poll(async () => previewFitsStage(stage, sheet)).toBe(true);
    await expectNoPageOverflow(page);

    await page.goto('/system/processes');
    await expect(page.getByRole('heading', { name: '审批流程设计' })).toBeVisible();
    await expect(page.locator('.process-mobile-view-switch')).toBeVisible();
    await expect(page.locator('.process-workspace')).toBeVisible();
    await expect(page.locator('.process-designer-shell > .definition-nav')).toBeHidden();
    await expectNoPageOverflow(page);
  });
});

async function visibleSystemNavigation(page: Page, projectName: string): Promise<Locator> {
  if (projectName !== 'mobile') {
    return page.locator('.desktop-navigation').getByRole('navigation', { name: '系统主导航' });
  }

  const bottomNavigation = page.getByRole('navigation', { name: '手机端主导航' });
  await expect(bottomNavigation).toBeVisible();
  await bottomNavigation.getByRole('button', { name: '更多', exact: true }).click();
  const drawer = page.locator('.app-mobile-drawer');
  await expect(drawer).toBeVisible();
  return drawer.getByRole('navigation', { name: '系统主导航' });
}

async function previewFitsStage(stage: Locator, sheet: Locator): Promise<boolean> {
  const [stageBox, sheetBox] = await Promise.all([stage.boundingBox(), sheet.boundingBox()]);
  return Boolean(stageBox && sheetBox && sheetBox.width <= stageBox.width + 1);
}

async function expectTableColumnsInside(table: Locator, labels: string[]): Promise<void> {
  const tableBox = await table.boundingBox();
  expect(tableBox).not.toBeNull();

  const horizontalOverflow = await table.evaluate((element) => {
    const scroller = element.querySelector<HTMLElement>('.el-scrollbar__wrap');
    return scroller ? scroller.scrollWidth - scroller.clientWidth : -1;
  });
  expect(horizontalOverflow, 'assignment table should not require horizontal scrolling').toBe(0);

  for (const label of labels) {
    const header = table.getByRole('columnheader', { name: label, exact: true });
    await expect(header).toHaveCount(1);
    const headerBox = await header.boundingBox();
    expect(headerBox, `${label} column should be rendered`).not.toBeNull();
    expect(
      headerBox!.x,
      `${label} column should not be clipped on the left`,
    ).toBeGreaterThanOrEqual(tableBox!.x - 1);
    expect(
      headerBox!.x + headerBox!.width,
      `${label} column should not be clipped on the right`,
    ).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 1);
  }
}

async function expectHorizontalTableScroll(table: Locator): Promise<void> {
  await expect(table).toHaveCount(1);
  const metrics = await table.evaluate((element) => {
    const scroller = element.querySelector<HTMLElement>('.el-scrollbar__wrap');
    return scroller
      ? {
          clientWidth: scroller.clientWidth,
          overflowX: getComputedStyle(scroller).overflowX,
          scrollWidth: scroller.scrollWidth,
        }
      : null;
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.scrollWidth).toBeGreaterThan(metrics!.clientWidth);
  expect(metrics!.overflowX).toBe('auto');
  await expect(table.locator('.el-scrollbar__bar.is-horizontal')).toBeVisible();
}
