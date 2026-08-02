import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoPageOverflow, loginThroughUi } from './advanced-fixtures';

const quickStartLabels = [
  '合同/支出请示',
  '合同审批',
  '合同付款',
  '印章证照外借',
  '印章证照使用',
  '物资申购',
  '物资领用',
] as const;

const desktopGeometry = {
  bannerMaxHeight: 170,
  calendarMaxHeight: 380,
  informationTopViewportRatio: 0.62,
  operationBottomTolerance: 10,
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

  test('390px keeps approval and process starts readable', async ({ page }, testInfo) => {
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
  const banner = portal.locator('.portal-banner');
  const metrics = portal.locator('.portal-metrics');
  const quickStarts = portal.locator('.portal-quick-starts');
  const information = portal.locator('.portal-information-layout');

  await expect(page.getByRole('heading', { name: '东方饭店公司门户', exact: true })).toBeVisible();
  await expect(metrics.getByRole('button').filter({ hasText: '待我审批' })).toBeVisible();
  await expect(quickStarts.getByText('快捷发起', { exact: true })).toBeVisible();
  await expect(quickStarts.getByText('合同/支出请示', { exact: true })).toBeVisible();

  for (const section of [banner, metrics, quickStarts]) {
    await expect(section).toBeVisible();
    await expectToIntersectFirstViewport(page, section);
  }

  await expectContainedBy(portal, metrics);
  await expectContainedBy(portal, quickStarts);
  await expectNoOverlap(metrics, quickStarts);
  await expectQuickStartLabelsReadable(quickStarts);

  if (mobile) {
    await expect(information).toBeVisible();
    await expectMobileInformationAboveNavigation(page, information);
    const navigation = page.getByRole('navigation', { name: '手机端主导航' });
    await expect(navigation.getByRole('button', { name: '审批中心', exact: true })).toBeVisible();
    await expect(navigation.getByRole('button', { name: '发起申请', exact: true })).toBeVisible();
  } else {
    await expectDesktopPortalDensity(page, portal, banner, metrics, quickStarts);
  }

  await expectNoPageOverflow(page);
}

async function expectMobileInformationAboveNavigation(
  page: Page,
  information: Locator,
): Promise<void> {
  const firstSectionTitle = information.getByText('公司新闻', { exact: true });
  await expect(firstSectionTitle).toBeVisible();

  const [viewport, informationBox, titleBox] = await Promise.all([
    page.viewportSize(),
    information.boundingBox(),
    firstSectionTitle.boundingBox(),
  ]);
  expect(viewport).not.toBeNull();
  expect(informationBox).not.toBeNull();
  expect(titleBox).not.toBeNull();

  const visibleBottom = viewport!.height - mobileGeometry.bottomNavigationClearance;
  expect(informationBox!.y).toBeLessThanOrEqual(visibleBottom);
  expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(visibleBottom);
}

async function expectDesktopPortalDensity(
  page: Page,
  portal: Locator,
  banner: Locator,
  metrics: Locator,
  quickStarts: Locator,
): Promise<void> {
  const information = portal.locator('.portal-information-layout');
  const calendar = portal.locator('.portal-calendar-panel');
  const companyNews = portal.locator('.portal-section-panel').filter({ hasText: '公司新闻' });
  const notices = portal.locator('.portal-section-panel').filter({ hasText: '通知公告' });

  await expect(information).toBeVisible();
  await expect(calendar).toBeVisible();
  await expect(companyNews).toHaveCount(1);
  await expect(notices).toHaveCount(1);

  const [viewport, bannerBox, informationBox, calendarBox, metricsBox, quickStartsBox] =
    await Promise.all([
      page.viewportSize(),
      banner.boundingBox(),
      information.boundingBox(),
      calendar.boundingBox(),
      metrics.boundingBox(),
      quickStarts.boundingBox(),
    ]);
  expect(viewport).not.toBeNull();
  expect(bannerBox).not.toBeNull();
  expect(informationBox).not.toBeNull();
  expect(calendarBox).not.toBeNull();
  expect(metricsBox).not.toBeNull();
  expect(quickStartsBox).not.toBeNull();

  expect(bannerBox!.height).toBeLessThanOrEqual(desktopGeometry.bannerMaxHeight);
  expect(informationBox!.y).toBeLessThanOrEqual(
    viewport!.height * desktopGeometry.informationTopViewportRatio,
  );
  expect(calendarBox!.height).toBeLessThanOrEqual(desktopGeometry.calendarMaxHeight);
  expect(
    Math.abs(metricsBox!.y + metricsBox!.height - (quickStartsBox!.y + quickStartsBox!.height)),
  ).toBeLessThanOrEqual(desktopGeometry.operationBottomTolerance);

  await expectToIntersectFirstViewport(page, companyNews);
  await expectToIntersectFirstViewport(page, notices);
}

async function expectToIntersectFirstViewport(page: Page, locator: Locator): Promise<void> {
  const [box, viewport] = await Promise.all([locator.boundingBox(), page.viewportSize()]);
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y).toBeLessThan(viewport!.height);
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

async function expectQuickStartLabelsReadable(quickStarts: Locator): Promise<void> {
  const labels = quickStarts.locator('button strong');
  await expect(labels).toHaveCount(quickStartLabels.length);

  const measurements = await labels.evaluateAll((elements) =>
    elements.map((element) => ({
      text: element.textContent?.trim() ?? '',
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })),
  );
  expect(measurements.map(({ text }) => text)).toEqual(quickStartLabels);
  expect(
    measurements.filter(({ clientWidth, scrollWidth }) => scrollWidth > clientWidth + 1),
    '快捷发起名称不得被省略或裁切',
  ).toEqual([]);
}
