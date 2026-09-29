import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoPageOverflow, loginThroughUi } from './advanced-fixtures';

const keyNavigationLabels = ['审批中心', '请示批复', '印章证照', '公司文件制度'] as const;

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
  { path: '/requests', heading: '请示批复' },
  { path: '/contract-approvals', heading: '合同审批' },
  { path: '/seal', heading: '印章证照' },
  { path: '/supply', heading: '物资申购与领用' },
  { path: '/documents', heading: '公司文件制度' },
  { path: '/notices', heading: '公司通知' },
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
    // 导航按业务分组折叠（手机在抽屉里同理）：先展开所在分组，再断言分组内的模块条目
    await navigation.getByText('业务中心', { exact: true }).click();
    for (const label of keyNavigationLabels) {
      await expect(navigation.getByText(label, { exact: true }).first()).toBeVisible();
    }

    await page.goto('/approval');
    await expect(page.getByRole('heading', { name: '待我审批', exact: true })).toBeVisible();
    await expect(page.locator('.ui-breadcrumb').getByText('审批中心')).toBeVisible();

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

    await openAssignmentDialog(page);
    const assignment = page.locator('.assignment-section');
    await expect(assignment.first()).toBeVisible();
    for (const table of await assignment.locator('.el-table').all()) {
      await expectTableColumnsInside(table);
    }
    await expectNoPageOverflow(page);
  });

  test('IAM assignments stay operable on a phone without page overflow', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'This assertion targets the mobile shell.');
    await page.goto('/system/iam');
    await page.getByRole('tab', { name: '用户授权', exact: true }).click();

    // 手机端：授权面板以全屏形式展开，内容单列呈现且不出现横向滚动的表格
    await openAssignmentDialog(page);
    const dialog = page.locator('.ui-dialog--compact');
    await expect(dialog).toBeVisible();
    const [dialogBox, viewport] = await Promise.all([dialog.boundingBox(), page.viewportSize()]);
    expect(dialogBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(Math.round(dialogBox!.width)).toBeGreaterThanOrEqual(viewport!.width - 2);
    // 手机端授权面板不再出现横向滚动的桌面表格；有列表时以卡片铺满单列
    await expect(dialog.locator('.el-table')).toHaveCount(0);
    const cards = dialog.locator('.ui-record, .assignment-card');
    if (await cards.count()) {
      const cardWidths = await cards.evaluateAll((elements) =>
        elements.map((element) => Math.round(element.getBoundingClientRect().width)),
      );
      const containerWidth = Math.round(dialogBox!.width);
      expect(cardWidths.every((width) => width <= containerWidth + 1)).toBe(true);
    }
    await expectNoPageOverflow(page);
  });

  test('mobile navigation stays usable and the A4 preview fits the viewport', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'This assertion targets the 390 x 844 project.');

    const bottomNavigation = page.getByRole('navigation', { name: '手机端主导航' });
    await expect(bottomNavigation).toBeVisible();
    for (const label of ['公司门户', '审批中心', '个人工作台', '更多']) {
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
      bottomNavigation.getByRole('button', { name: '更多', exact: true }),
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
    await page.getByRole('tab', { name: '流程画布' }).click();
    await expect(page.locator('.process-mobile-view-switch')).toBeVisible();
    await expect(page.locator('.process-workspace')).toBeVisible();
    await expect(page.locator('.process-designer-shell > .definition-nav')).toBeHidden();
    await expectNoPageOverflow(page);
  });
});

/** 打开某个用户的授权面板：授权信息在弹层（手机端为全屏）里编辑 */
async function openAssignmentDialog(page: Page): Promise<void> {
  const assign = page.getByRole('button', { name: '分配授权' }).first();
  await expect(assign).toBeVisible();
  await assign.click();
  await expect(page.locator('.ui-dialog')).toBeVisible();
}

async function visibleSystemNavigation(page: Page, projectName: string): Promise<Locator> {
  if (projectName !== 'mobile') {
    return page.locator('.ui-sidebar').getByRole('navigation', { name: '系统主导航' });
  }

  const bottomNavigation = page.getByRole('navigation', { name: '手机端主导航' });
  await expect(bottomNavigation).toBeVisible();
  await bottomNavigation.getByRole('button', { name: '更多', exact: true }).click();
  const drawer = page.locator('.ui-menu-drawer');
  await expect(drawer).toBeVisible();
  return drawer.getByRole('navigation', { name: '系统主导航' });
}

async function previewFitsStage(stage: Locator, sheet: Locator): Promise<boolean> {
  const [stageBox, sheetBox] = await Promise.all([stage.boundingBox(), sheet.boundingBox()]);
  return Boolean(stageBox && sheetBox && sheetBox.width <= stageBox.width + 1);
}

async function expectTableColumnsInside(table: Locator): Promise<void> {
  const tableBox = await table.boundingBox();
  expect(tableBox).not.toBeNull();

  const horizontalOverflow = await table.evaluate((element) => {
    const scroller = element.querySelector<HTMLElement>('.el-scrollbar__wrap');
    return scroller ? scroller.scrollWidth - scroller.clientWidth : -1;
  });
  expect(horizontalOverflow, 'assignment table should not require horizontal scrolling').toBe(0);

  const headers = table.getByRole('columnheader');
  const count = await headers.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const headerBox = await headers.nth(index).boundingBox();
    const label = (await headers.nth(index).innerText()).trim();
    expect(headerBox, `${label} column should be rendered`).not.toBeNull();
    expect(headerBox!.x, `${label} column should not be clipped on the left`).toBeGreaterThanOrEqual(
      tableBox!.x - 1,
    );
    expect(
      headerBox!.x + headerBox!.width,
      `${label} column should not be clipped on the right`,
    ).toBeLessThanOrEqual(tableBox!.x + tableBox!.width + 1);
  }
}

