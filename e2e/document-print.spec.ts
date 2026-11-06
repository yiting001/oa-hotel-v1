import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { apiLogin, authorizedPost, loginThroughUi } from './advanced-fixtures';

interface CreatedDocumentEnvelope {
  data: { id: string };
}

const minimumNonBlankPdfBytes = 10_000;

test.describe('A4 print media isolation', () => {
  test.describe.configure({ timeout: 60_000 });

  test('business document remains visible in print media', async ({ page, request }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Print media is covered by the desktop project.',
    );

    const applicant = await apiLogin(request, 'applicant');
    const title = `[E2E print ${randomUUID().slice(0, 8)}] Business document visibility`;
    const created = await authorizedPost<CreatedDocumentEnvelope>(
      request,
      applicant,
      '/contracts/requests',
      {
        title,
        requestedAt: '2026-07-21',
        amountCents: 1_280_000,
        content: 'Verify that shared designer styles cannot hide the business A4 print sheet.',
        attachments: [],
      },
    );

    await loginThroughUi(page, 'applicant');
    await page.goto(`/documents/CONTRACT_REQUEST/${created.data.id}/print`);

    const sheet = page.locator('.business-print-sheet');
    const printedTitle = sheet.getByText(title, { exact: true });
    await expect(sheet).toBeVisible();
    await expect(printedTitle).toBeVisible();

    await page.emulateMedia({ media: 'print' });

    await expect(sheet).toHaveCSS('visibility', 'visible');
    await expect(sheet).toBeVisible();
    await expect(printedTitle).toBeVisible();
    await expect(page.locator('.business-print-toolbar')).toBeHidden();

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pdf.byteLength).toBeGreaterThan(minimumNonBlankPdfBytes);
  });

  test('food purchase prints the paper requisition layout', async ({ page, request }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Print media is covered by the desktop project.',
    );

    const applicant = await apiLogin(request, 'applicant');
    const created = await authorizedPost<CreatedDocumentEnvelope>(
      request,
      applicant,
      '/food-purchases',
      {
        applicationDate: '2026-10-28',
        teamName: '中厨房',
        items: [
          {
            category: '肉禽类',
            name: '五花肉',
            specification: '散装',
            unit: '斤',
            quantity: 5,
            requirement: '新鲜、切块',
            remark: '每日配送',
          },
        ],
        attachments: [],
      },
    );

    await loginThroughUi(page, 'applicant');
    await page.goto(`/documents/FOOD_PURCHASE/${created.data.id}/print`);

    const sheet = page.locator('.business-print-sheet');
    await expect(sheet.getByText('餐饮食品原材料请购单', { exact: true })).toBeVisible();
    await expect(sheet.getByText('中厨房', { exact: true })).toBeVisible();
    for (const label of ['品名', '数量', '单位', '要求', '备注']) {
      await expect(sheet.getByRole('columnheader', { name: label })).toBeVisible();
    }
    await expect(sheet.getByText('五花肉', { exact: true })).toBeVisible();
    await expect(sheet.getByText('新鲜、切块', { exact: true })).toBeVisible();
    for (const label of ['填单人', '厨师长签字', '送单时间', '部门审核', '财务审核']) {
      await expect(sheet.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('form designer keeps its A4 sheet visible in print media', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Print media is covered by the desktop project.',
    );

    await loginThroughUi(page, 'office');
    await page.goto('/system/forms');

    const sheet = page.locator('.a4-sheet');
    const printedTitle = sheet.locator('.a4-sheet__header h2');
    await expect(sheet).toBeVisible();
    await expect(printedTitle).toHaveText(/\S+/);

    await page.emulateMedia({ media: 'print' });

    await expect(sheet).toHaveCSS('visibility', 'visible');
    await expect(sheet).toBeVisible();
    await expect(printedTitle).toBeVisible();
    await expect(page.locator('.platform-page-header')).toBeHidden();
  });

  test('mobile designer prints the A4 sheet from a non-preview panel', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile',
      'This assertion targets the mobile panel layout.',
    );

    await loginThroughUi(page, 'office');
    await page.goto('/system/forms');

    const panelNavigation = page.getByRole('navigation', { name: '表单设计面板' });
    await panelNavigation.getByText('表单库', { exact: true }).click();
    await expect(page.locator('.a4-stage')).toHaveCount(0);

    // 打印预览会把面板切回预览：纸面必须可见（否则打印出的是空白）
    await page.getByRole('button', { name: '打印预览' }).click();
    await expect(page.locator('.a4-stage')).toHaveCount(1);

    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.a4-sheet')).toBeVisible();
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pdf.byteLength).toBeGreaterThan(minimumNonBlankPdfBytes);
  });
});
