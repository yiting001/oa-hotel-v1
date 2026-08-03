import type {
  BatchApprovalResult,
  PortalAdminContentDetail,
  PortalHomeResponse,
} from '@oa/contracts';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  apiBaseUrl,
  apiLogin,
  authorizedGet,
  createOfficeSealUseFixture,
  expectJson,
  expectNoPageOverflow,
  loginThroughUi,
} from './advanced-fixtures';

test.describe('advanced portal and workbench capabilities', () => {
  test.describe.configure({ timeout: 90_000 });

  test('office manages an EVENT through schedule, publish, withdraw, and audit', async ({
    page,
    request,
  }, testInfo) => {
    const title = `[E2E ${testInfo.project.name}] 宴会会议 ${Date.now()}`;
    const revisedSummary = '企业客户答谢宴的时间、场地与跨部门保障安排。';

    await loginThroughUi(page, 'office');
    await page.goto('/portal/content-management');
    await expect(page.getByRole('heading', { name: '内容管理' })).toBeVisible();
    await expectNoPageOverflow(page);

    await page.getByTestId('portal-content-create').click();
    await expect(page.getByTestId('portal-content-editor')).toBeVisible();
    await page.getByTestId('portal-content-category').click();
    await page.getByRole('option', { name: '宴会会议' }).click();
    await page.getByTestId('portal-content-title').fill(title);
    await page
      .getByTestId('portal-content-summary')
      .fill('用于验证公司门户宴会会议栏目与内容发布全流程。');
    await page
      .getByTestId('portal-content-body')
      .fill('<p>会议时间、场地与服务保障信息已确认。</p>');

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith('/api/v1/portal/admin/contents'),
    );
    await page.getByTestId('portal-content-save').click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as PortalAdminContentDetail;
    const contentId = created.id;
    await expect(contentContainer(page, testInfo.project.name, contentId, title)).toContainText(
      '草稿',
    );

    await contentAction(page, testInfo.project.name, 'edit', contentId).click();
    await expect(page.getByTestId('portal-content-editor')).toBeVisible();
    await page.getByTestId('portal-content-summary').fill(revisedSummary);
    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        new URL(response.url()).pathname.endsWith(`/api/v1/portal/admin/contents/${contentId}`),
    );
    await page.getByTestId('portal-content-save').click();
    expect((await updateResponsePromise).status()).toBe(200);
    await expect(contentContainer(page, testInfo.project.name, contentId, title)).toContainText(
      revisedSummary,
    );

    await contentAction(page, testInfo.project.name, 'publish', contentId).click();
    const publishDialog = page.getByTestId('portal-content-publish-dialog');
    await expect(publishDialog).toBeVisible();
    await publishDialog.getByText('定时发布', { exact: true }).click();
    const scheduledAtInput = page.getByLabel('定时发布时间');
    await scheduledAtInput.fill('2099-12-31 09:00');
    await scheduledAtInput.press('Enter');
    await expect(scheduledAtInput).toHaveValue('2099-12-31 09:00');
    const scheduleResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith(
          `/api/v1/portal/admin/contents/${contentId}/publish`,
        ),
    );
    await page.getByTestId('portal-content-confirm-publish').click();
    expect((await scheduleResponsePromise).status()).toBe(201);
    await expect(contentContainer(page, testInfo.project.name, contentId, title)).toContainText(
      '定时发布',
    );

    const applicant = await apiLogin(request, 'applicant');
    const scheduledHome = await authorizedGet<PortalHomeResponse>(
      request,
      applicant,
      '/portal/home',
    );
    expect(portalTitles(scheduledHome)).not.toContain(title);

    await contentAction(page, testInfo.project.name, 'publish', contentId).click();
    await expect(publishDialog).toBeVisible();
    await publishDialog.getByText('立即发布', { exact: true }).click();
    const publishNowResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith(
          `/api/v1/portal/admin/contents/${contentId}/publish`,
        ),
    );
    await page.getByTestId('portal-content-confirm-publish').click();
    expect((await publishNowResponsePromise).status()).toBe(201);
    await expect(contentContainer(page, testInfo.project.name, contentId, title)).toContainText(
      '已发布',
    );

    await loginThroughUi(page, 'applicant');
    const eventSection = page.locator('.portal-section-panel').filter({ hasText: title });
    await expect(eventSection.getByText('宴会会议', { exact: true })).toBeVisible();
    await expect(eventSection.getByText(title, { exact: true })).toBeVisible();
    await expectNoPageOverflow(page);

    await loginThroughUi(page, 'office');
    await page.goto('/portal/content-management');
    await page.getByLabel('搜索内容').fill(title);
    await page.getByRole('button', { name: '查询' }).click();
    await expect(contentContainer(page, testInfo.project.name, contentId, title)).toBeVisible();
    await contentAction(page, testInfo.project.name, 'withdraw', contentId).click();
    const withdrawDialog = page.getByRole('dialog', { name: '确认撤回' });
    await expect(withdrawDialog).toBeVisible();
    const withdrawResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith(
          `/api/v1/portal/admin/contents/${contentId}/withdraw`,
        ),
    );
    await withdrawDialog.getByRole('button', { name: '确认撤回' }).click();
    expect((await withdrawResponsePromise).status()).toBe(201);
    await expect(contentContainer(page, testInfo.project.name, contentId, title)).toContainText(
      '已撤回',
    );

    await contentAction(page, testInfo.project.name, 'audit', contentId).click();
    const auditDrawer = page.getByTestId('portal-content-audit-drawer');
    await expect(auditDrawer).toBeVisible();
    for (const action of ['创建草稿', '保存修订', '设置定时发布', '发布内容', '撤回内容']) {
      await expect(auditDrawer.getByText(action, { exact: true })).toBeVisible();
    }
    await expectNoPageOverflow(page);
  });

  test('office and applicant collaborate before an idempotent batch approval', async ({
    page,
    request,
  }, testInfo) => {
    const fixture = await createOfficeSealUseFixture(request, testInfo);
    const [firstDocument, secondDocument] = fixture.documents;
    const [firstTaskId, secondTaskId] = fixture.officeTaskIds;
    expect(firstDocument).toBeTruthy();
    expect(secondDocument).toBeTruthy();
    expect(firstTaskId).toBeTruthy();
    expect(secondTaskId).toBeTruthy();

    await loginThroughUi(page, 'office');
    await page.goto('/approval');
    await expect(pendingTaskOpen(page, testInfo.project.name, firstTaskId!)).toBeVisible();
    await expect(pendingTaskOpen(page, testInfo.project.name, secondTaskId!)).toBeVisible();
    await expectNoPageOverflow(page);

    await pendingTaskOpen(page, testInfo.project.name, firstTaskId!).click();
    await expect(page.getByRole('dialog', { name: '审批单据' })).toBeVisible();
    const followToggle = page.getByTestId('document-follow-toggle');
    await expect(followToggle).toHaveAttribute('aria-label', '关注单据');
    await followToggle.click();
    await expect(followToggle).toHaveAttribute('aria-label', '取消关注单据');

    await page.getByRole('button', { name: '抄送', exact: true }).click();
    await page.getByTestId('workflow-copy-recipients').click();
    await page.getByRole('option', { name: '业务申请人 · 业务部' }).click();
    await page.keyboard.press('Escape');
    const copyResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith(
          `/api/v1/workflow/documents/${firstDocument!.id}/copies`,
        ),
    );
    await page.getByTestId('workflow-copy-confirm').click();
    expect((await copyResponsePromise).status()).toBe(201);
    await page
      .getByRole('dialog', { name: '审批单据' })
      .getByRole('button', { name: '关闭此对话框' })
      .click();

    await page.goto('/workbench?tab=following');
    await expectActiveWorkbenchTabVisible(page, testInfo.project.name);
    const officeFollowing = workbenchDocumentContainer(
      page,
      testInfo.project.name,
      firstDocument!.title,
    );
    await expect(officeFollowing).toBeVisible();
    await workbenchDocumentOpen(page, testInfo.project.name, firstDocument!.title).click();
    await expect(page.getByTestId('document-follow-toggle')).toHaveAttribute(
      'aria-label',
      '取消关注单据',
    );
    await page.getByTestId('document-follow-toggle').click();
    await expect(page.getByTestId('document-follow-toggle')).toHaveAttribute(
      'aria-label',
      '关注单据',
    );

    await loginThroughUi(page, 'applicant');
    await page.goto('/workbench?tab=copied');
    await expectActiveWorkbenchTabVisible(page, testInfo.project.name);
    const applicantCopy = workbenchDocumentContainer(
      page,
      testInfo.project.name,
      firstDocument!.title,
    );
    await expect(applicantCopy).toContainText('未读');
    await expect(applicantCopy).toContainText('办公室审核人');
    const copyReadResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.includes('/api/v1/workflow/copies/') &&
        new URL(response.url()).pathname.endsWith('/read'),
    );
    await workbenchDocumentOpen(page, testInfo.project.name, firstDocument!.title).click();
    expect((await copyReadResponsePromise).status()).toBe(201);
    await expect(page.getByTestId('document-follow-toggle')).toHaveAttribute(
      'aria-label',
      '关注单据',
    );
    await page.getByTestId('document-follow-toggle').click();
    await expect(page.getByTestId('document-follow-toggle')).toHaveAttribute(
      'aria-label',
      '取消关注单据',
    );
    await page.getByTestId('document-follow-toggle').click();
    await page.goto('/workbench?tab=copied');
    await expectActiveWorkbenchTabVisible(page, testInfo.project.name);
    await expect(
      workbenchDocumentContainer(page, testInfo.project.name, firstDocument!.title),
    ).toContainText('已读');
    await expectNoPageOverflow(page);

    await loginThroughUi(page, 'office');
    await page.goto('/approval');
    await selectPendingTask(page, testInfo.project.name, firstTaskId!, firstDocument!.title);
    await selectPendingTask(page, testInfo.project.name, secondTaskId!, secondDocument!.title);
    await expect(page.getByText('已选择 2 条本页待办')).toBeVisible();
    await page.getByRole('button', { name: '清空', exact: true }).click();
    await expect(page.getByText('已选择 0 条本页待办')).toBeVisible();
    await expect(
      pendingTaskCheckbox(page, testInfo.project.name, firstTaskId!, firstDocument!.title),
    ).not.toBeChecked();
    await expect(
      pendingTaskCheckbox(page, testInfo.project.name, secondTaskId!, secondDocument!.title),
    ).not.toBeChecked();
    await selectPendingTask(page, testInfo.project.name, firstTaskId!, firstDocument!.title);
    await selectPendingTask(page, testInfo.project.name, secondTaskId!, secondDocument!.title);
    await page.getByTestId('batch-approval-open').click();
    await page.getByTestId('batch-approval-comment').fill(`E2E ${fixture.runId} 批量同意`);

    const batchRequestPromise = page.waitForRequest(
      (request) =>
        request.method() === 'POST' &&
        new URL(request.url()).pathname.endsWith('/api/v1/workflow/tasks/batch-approve'),
    );
    const batchResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith('/api/v1/workflow/tasks/batch-approve'),
    );
    await page.getByTestId('batch-approval-confirm').click();
    const batchRequest = await batchRequestPromise;
    const batchResponse = await batchResponsePromise;
    expect(batchResponse.status()).toBe(201);
    const batchPayload = batchRequest.postDataJSON() as {
      requestId: string;
      taskIds: string[];
      comment: string;
    };
    const batchResult = (await batchResponse.json()) as BatchApprovalResult;
    expect(new Set(batchPayload.taskIds)).toEqual(new Set([firstTaskId, secondTaskId]));
    expect(batchResult).toMatchObject({ total: 2, succeeded: 2, failed: 0 });

    const resultDialog = page.getByTestId('batch-approval-result');
    await expect(resultDialog).toContainText('全部审批完成');
    await expect(resultDialog).toContainText('成功 2 项，失败 0 项');
    await expect(resultDialog).toContainText(firstDocument!.title);
    await expect(resultDialog).toContainText(secondDocument!.title);

    const replayResponse = await request.post(`${apiBaseUrl}/workflow/tasks/batch-approve`, {
      data: batchPayload,
      headers: { Authorization: `Bearer ${fixture.office.accessToken}` },
    });
    const replayResult = await expectJson<BatchApprovalResult>(
      replayResponse,
      201,
      'idempotent batch replay',
    );
    expect(replayResult).toEqual(batchResult);

    await resultDialog.getByRole('button', { name: '完成' }).click();
    await expect(pendingTaskOpen(page, testInfo.project.name, firstTaskId!)).toHaveCount(0);
    await expect(pendingTaskOpen(page, testInfo.project.name, secondTaskId!)).toHaveCount(0);
    await expect(page.getByText('已选择 0 条本页待办')).toBeVisible();
    await expectNoPageOverflow(page);
  });
});

type ContentAction = 'edit' | 'publish' | 'withdraw' | 'audit';

function contentAction(
  page: Page,
  projectName: string,
  action: ContentAction,
  contentId: string,
): Locator {
  const suffix = projectName === 'mobile' ? `-${action}-mobile-` : `-${action}-`;
  return page.getByTestId(`portal-content${suffix}${contentId}`);
}

function contentContainer(
  page: Page,
  projectName: string,
  contentId: string,
  title: string,
): Locator {
  if (projectName === 'mobile') return page.getByTestId(`portal-content-card-${contentId}`);
  return page.getByTestId('portal-content-table').getByRole('row').filter({ hasText: title });
}

function portalTitles(home: PortalHomeResponse): string[] {
  return home.sections.flatMap((section) => section.items.map((item) => item.title));
}

function workbenchDocumentContainer(page: Page, projectName: string, title: string): Locator {
  const selector = projectName === 'mobile' ? '.portal-table--mobile' : '.portal-table--desktop';
  const surface = page.getByRole('tabpanel').locator(selector);
  return projectName === 'mobile'
    ? surface.getByRole('button').filter({ hasText: title })
    : surface.getByRole('row').filter({ hasText: title });
}

function workbenchDocumentOpen(page: Page, projectName: string, title: string): Locator {
  const container = workbenchDocumentContainer(page, projectName, title);
  return projectName === 'mobile'
    ? container
    : container.getByRole('button', { name: title, exact: true });
}

async function selectPendingTask(
  page: Page,
  projectName: string,
  taskId: string,
  title: string,
): Promise<void> {
  const checkbox = pendingTaskCheckbox(page, projectName, taskId, title);
  if (projectName === 'mobile') await checkbox.check();
  else await checkbox.locator('xpath=../..').click();
}

function pendingTaskCheckbox(
  page: Page,
  projectName: string,
  taskId: string,
  title: string,
): Locator {
  if (projectName === 'mobile') return page.getByTestId(`workbench-task-select-${taskId}`);
  const row = page
    .getByRole('tabpanel')
    .getByTestId('workbench-task-table')
    .getByRole('row')
    .filter({ hasText: title });
  return row.getByRole('checkbox');
}

function pendingTaskOpen(page: Page, projectName: string, taskId: string): Locator {
  const selector = projectName === 'mobile' ? '.portal-table--mobile' : '.portal-table--desktop';
  return page.getByRole('tabpanel').locator(selector).getByTestId(`workbench-task-open-${taskId}`);
}

async function expectActiveWorkbenchTabVisible(page: Page, projectName: string): Promise<void> {
  if (projectName === 'mobile') {
    await expect(page.getByRole('tab', { selected: true })).toBeInViewport();
  }
}
