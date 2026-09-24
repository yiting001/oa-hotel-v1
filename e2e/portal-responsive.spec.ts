import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoPageOverflow, loginThroughUi } from './advanced-fixtures';

const desktopGeometry = {
  imageStripMaxHeight: 220,
  sidebarMaxViewportRatio: 1.6,
  informationTopViewportRatio: 0.72,
} as const;

const mobileGeometry = {
  bottomNavigationClearance: 90,
} as const;

test.describe('company portal responsive layout', () => {
  test.describe.configure({ timeout: 60_000 });

  test('desktop keeps the first-screen operations readable', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop geometry is covered once.');
    await loginThroughUi(page, 'office');
    await expectPortalLayout(page, false);
  });

  test('390px keeps approval entry and portal content readable', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'The mobile project uses a 390px viewport.');
    await loginThroughUi(page, 'office');
    await expectPortalLayout(page, true);
  });

  test('320px keeps the portal within the narrow mobile boundary', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'The 320px boundary is covered once.');
    await page.setViewportSize({ width: 320, height: 740 });
    await loginThroughUi(page, 'office');
    await expectPortalLayout(page, true);
  });
});

async function expectPortalLayout(page: Page, mobile: boolean): Promise<void> {
  const portal = page.locator('.portal-page');
  const imageStrip = portal.locator('.portal-image-strip');
  const metrics = portal.getByTestId('workspace-metric-strip');
  const sections = portal.locator('.portal-sections');
  const sidebar = portal.locator('.portal-sidebar');
  const links = sidebar.locator('.portal-links-panel');

  await expect(page.getByRole('heading', { name: '公司门户', exact: true })).toBeVisible();
  await expect(metrics.getByTestId('workspace-metric-item').filter({ hasText: '待我审批' })).toBeVisible();
  await expect(sections.locator('.portal-section-panel').first()).toBeVisible();
  await expect(links.getByText('常用链接', { exact: true })).toBeVisible();

  for (const region of [imageStrip, metrics, sections]) {
    await expect(region).toBeVisible();
    await expectToIntersectFirstViewport(page, region);
  }

  await expectContainedBy(portal, metrics);
  await expectContainedBy(portal, sections);
  await expectNoOverlap(metrics, sections);

  // 业务约束：门户的「待我审批」入口直接进入审批中心，而不是个人工作台
  await metrics.getByTestId('workspace-metric-item').filter({ hasText: '待我审批' }).click();
  await expect(page).toHaveURL(/\/approval/);
  await expect(page.getByRole('heading', { name: '待我审批', exact: true })).toBeVisible();
  await page.goBack();

  if (mobile) {
    await expect(sidebar).toBeVisible();
    await expectMobileContentAboveNavigation(page, sections);
    const navigation = page.getByRole('navigation', { name: '手机端主导航' });
    await expect(navigation.getByRole('button', { name: '审批中心', exact: true })).toBeVisible();
  } else {
    await expectDesktopPortalDensity(page, portal, imageStrip, sidebar);
  }

  await expectNoPageOverflow(page);
}

async function expectMobileContentAboveNavigation(page: Page, sections: Locator): Promise<void> {
  const firstSectionTitle = sections.getByText('公司新闻', { exact: true });
  await expect(firstSectionTitle).toBeVisible();

  const [viewport, sectionsBox] = await Promise.all([page.viewportSize(), sections.boundingBox()]);
  expect(viewport).not.toBeNull();
  expect(sectionsBox).not.toBeNull();

  const visibleBottom = viewport!.height - mobileGeometry.bottomNavigationClearance;
  expect(sectionsBox!.y).toBeLessThanOrEqual(visibleBottom);
}

async function expectDesktopPortalDensity(
  page: Page,
  portal: Locator,
  imageStrip: Locator,
  sidebar: Locator,
): Promise<void> {
  const companyNews = portal.locator('.portal-section-panel').filter({ hasText: '公司新闻' });
  const notices = portal.locator('.portal-section-panel').filter({ hasText: '通知公告' });

  await expect(companyNews).toHaveCount(1);
  await expect(notices).toHaveCount(1);
  await expect(sidebar.locator('.portal-calendar-panel')).toBeVisible();

  const [viewport, stripBox, sidebarBox] = await Promise.all([
    page.viewportSize(),
    imageStrip.boundingBox(),
    sidebar.boundingBox(),
  ]);
  expect(viewport).not.toBeNull();
  expect(stripBox).not.toBeNull();
  expect(sidebarBox).not.toBeNull();

  expect(stripBox!.height).toBeLessThanOrEqual(desktopGeometry.imageStripMaxHeight);
  expect(sidebarBox!.height).toBeLessThanOrEqual(
    viewport!.height * desktopGeometry.sidebarMaxViewportRatio,
  );
  expect(stripBox!.y + stripBox!.height).toBeLessThan(
    viewport!.height * desktopGeometry.informationTopViewportRatio,
  );

  await expectToIntersectFirstViewport(page, companyNews);
  await expectToIntersectFirstViewport(page, notices);
}

async function expectToIntersectFirstViewport(page: Page, locator: Locator): Promise<void> {
  const [box, viewport] = await Promise.all([locator.boundingBox(), page.viewportSize()]);
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  // 门户首屏是品牌图 + 工作摘要，栏目紧随其后，允许落在首屏下沿之外一屏内
  expect(box!.y).toBeLessThan(viewport!.height * 1.5);
  expect(box!.y + box!.height).toBeGreaterThan(0);
}

async function expectContainedBy(container: Locator, content: Locator): Promise<void> {
  const [containerBox, contentBox] = await Promise.all([
    container.boundingBox(),
    content.boundingBox(),
  ]);
  expect(containerBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(contentBox!.x).toBeGreaterThanOrEqual(containerBox!.x - 1);
  expect(contentBox!.x + contentBox!.width).toBeLessThanOrEqual(
    containerBox!.x + containerBox!.width + 1,
  );
}

async function expectNoOverlap(first: Locator, second: Locator): Promise<void> {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  const overlapWidth = Math.max(
    0,
    Math.min(firstBox!.x + firstBox!.width, secondBox!.x + secondBox!.width) -
      Math.max(firstBox!.x, secondBox!.x),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(firstBox!.y + firstBox!.height, secondBox!.y + secondBox!.height) -
      Math.max(firstBox!.y, secondBox!.y),
  );
  expect(overlapWidth * overlapHeight).toBe(0);
}
