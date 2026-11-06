import { expect, test } from '@playwright/test';
import { expectNoPageOverflow, loginThroughUi } from './advanced-fixtures';

const workspaces = [
  { path: '/requests', title: '请示批复', hiddenTitle: true },
  { path: '/contract-approvals', title: '合同审批' },
  { path: '/seal', title: '印章申请' },
  { path: '/seal/licenses', title: '证照申请' },
  { path: '/supply', title: '物资申购与领用' },
] as const;

test.describe('业务工作台视觉一致性', () => {
  test('合同、印章和物资共用统一首页结构', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await loginThroughUi(page, 'office');
    for (const workspace of workspaces) {
      await page.goto(workspace.path);
      if ('hiddenTitle' in workspace && workspace.hiddenTitle) {
        // 请示批复按需求隐藏大标题：确认页头没有 h1，其余结构保持一致
        await expect(page.locator('.page-header h1')).toHaveCount(0);
      } else {
        await expect(page.getByRole('heading', { name: workspace.title, exact: true })).toBeVisible();
      }
      await expect(page.getByTestId('workspace-metric-strip')).toBeVisible();
      await expect(page.getByTestId('workspace-metric-item')).toHaveCount(4);
      await expect(page.locator('[data-testid="workspace-filter-bar"]:visible')).toBeVisible();
      await expect(page.getByRole('button', { name: '刷新', exact: true })).toBeVisible();
      await expect(page.getByText('No data', { exact: true })).toHaveCount(0);
      await expectNoPageOverflow(page);
    }
    expect(pageErrors, '业务首页不应产生运行时错误').toEqual([]);
  });

  test('登录、门户与新闻封面使用本地东方饭店图片', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '品牌图片路径只需要检查一次。');

    await page.goto('/login');
    await expect(page.locator('.login__visual')).toHaveCSS(
      'background-image',
      /dongfang-courtyard-dusk\.webp/,
    );

    await loginThroughUi(page, 'office');
    await expect(page.locator('.portal-image-strip')).toHaveCSS(
      'background-image',
      /dongfang-courtyard-day\.webp/,
    );
    await expect(page.locator('.portal-section-panel img').first()).toHaveAttribute(
      'src',
      /dongfang-tower-sunset\.webp/,
    );
  });
});
