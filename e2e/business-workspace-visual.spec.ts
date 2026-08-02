import { expect, test } from '@playwright/test';
import { expectNoPageOverflow, loginThroughUi } from './advanced-fixtures';

const workspaces = [
  { path: '/contract', title: '合同与支出管理' },
  { path: '/seal', title: '行政印章' },
  { path: '/supply', title: '物资申购与领用' },
] as const;

test.describe('业务工作台视觉一致性', () => {
  test('合同、印章和物资共用统一首页结构', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await loginThroughUi(page, 'office');
    for (const workspace of workspaces) {
      await page.goto(workspace.path);
      await expect(page.getByRole('heading', { name: workspace.title, exact: true })).toBeVisible();
      await expect(page.getByTestId('workspace-metric-strip')).toBeVisible();
      await expect(page.getByTestId('workspace-metric-item')).toHaveCount(4);
      await expect(page.getByTestId('workspace-filter-bar')).toBeVisible();
      await expect(page.getByRole('button', { name: '刷新', exact: true })).toBeVisible();
      await expect(page.getByText('No data', { exact: true })).toHaveCount(0);
      await expectNoPageOverflow(page);
    }
    expect(pageErrors, '业务首页不应产生运行时错误').toEqual([]);
  });

  test('登录、门户与新闻封面使用本地东方饭店图片', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', '品牌图片路径只需要检查一次。');

    await page.goto('/login');
    await expect(page.locator('.login-page')).toHaveCSS(
      'background-image',
      /dongfang-courtyard-dusk\.webp/,
    );

    await loginThroughUi(page, 'office');
    await expect(page.locator('.portal-banner')).toHaveCSS(
      'background-image',
      /dongfang-courtyard-day\.webp/,
    );
    await expect(page.locator('.portal-featured-news img')).toHaveAttribute(
      'src',
      /dongfang-tower-sunset\.webp/,
    );
  });
});
