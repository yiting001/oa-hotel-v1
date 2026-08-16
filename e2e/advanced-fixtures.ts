import { randomUUID } from 'node:crypto';
import {
  expect,
  type APIRequestContext,
  type APIResponse,
  type Page,
  type TestInfo,
} from '@playwright/test';

export const apiBaseUrl = process.env.OA_E2E_API_ORIGIN ?? 'http://127.0.0.1:3101/api/v1';

export interface ApiSession {
  accessToken: string;
}

export interface OfficeSealUseFixture {
  applicant: ApiSession;
  manager: ApiSession;
  office: ApiSession;
  documents: Array<{ id: string; title: string }>;
  officeTaskIds: string[];
  runId: string;
}

interface CreatedDocumentEnvelope {
  data: { id: string };
}

interface WorkflowTaskReference {
  id: string;
  documentId: string;
}

export async function loginThroughUi(page: Page, username: string): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.getByLabel('账号').fill(username);
  await page.getByLabel('密码').fill('Demo123!');
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname.endsWith('/api/v1/auth/login'),
  );
  await page.getByRole('button', { name: /登\s*录/ }).click();
  expect((await loginResponsePromise).status()).toBe(201);
  await expect(page).toHaveURL((url) => url.pathname === '/' && url.search === '');
}

export async function apiLogin(request: APIRequestContext, username: string): Promise<ApiSession> {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { username, password: 'Demo123!' },
  });
  return expectJson<ApiSession>(response, 201, `${username} API login`);
}

export async function createOfficeSealUseFixture(
  request: APIRequestContext,
  testInfo: TestInfo,
  count = 2,
): Promise<OfficeSealUseFixture> {
  const [applicant, manager, office] = await Promise.all([
    apiLogin(request, 'applicant'),
    apiLogin(request, 'manager'),
    apiLogin(request, 'office'),
  ]);
  const runId = `${testInfo.project.name}-${randomUUID().slice(0, 8)}`;
  const documents: Array<{ id: string; title: string }> = [];

  for (let index = 1; index <= count; index += 1) {
    const purpose = `[E2E ${runId}] 批量用印 ${index}`;
    const created = await authorizedPost<CreatedDocumentEnvelope>(
      request,
      applicant,
      '/seals/use-requests',
      {
        useDate: shanghaiBusinessDate(2),
        purpose,
        sealAssetNames: ['公司公章'],
        content: `Playwright 独立测试单据 ${index}，不消费共享演示待办。`,
        attachments: [],
      },
    );
    const documentId = created.data.id;
    documents.push({ id: documentId, title: `印章证照使用：${purpose}` });

    await authorizedPost(request, applicant, `/workflow/documents/${documentId}/submit`, {
      requestId: randomUUID(),
    });
    const managerTask = await taskForDocument(request, manager, documentId);
    await authorizedPost(request, manager, `/workflow/tasks/${managerTask.id}/approve`, {
      requestId: randomUUID(),
      comment: `E2E ${runId} 部门审核同意`,
    });
  }

  const officeTasks = await workflowTasks(request, office);
  const officeTaskIds = documents.map(({ id }) => {
    const task = officeTasks.find((candidate) => candidate.documentId === id);
    expect(task, `office task for ${id}`).toBeTruthy();
    return task!.id;
  });

  return { applicant, manager, office, documents, officeTaskIds, runId };
}

export async function expectJson<T>(
  response: APIResponse,
  expectedStatus: number,
  label: string,
): Promise<T> {
  const body = (await response.json()) as T;
  expect(response.status(), `${label}: ${JSON.stringify(body)}`).toBe(expectedStatus);
  return body;
}

export async function authorizedPost<T = unknown>(
  request: APIRequestContext,
  session: ApiSession,
  path: string,
  data?: unknown,
): Promise<T> {
  const response = await request.post(`${apiBaseUrl}${path}`, {
    data,
    headers: authorization(session),
  });
  return expectJson<T>(response, 201, `POST ${path}`);
}

export async function authorizedGet<T>(
  request: APIRequestContext,
  session: ApiSession,
  path: string,
): Promise<T> {
  const response = await request.get(`${apiBaseUrl}${path}`, {
    headers: authorization(session),
  });
  return expectJson<T>(response, 200, `GET ${path}`);
}

export async function expectNoPageOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

function authorization(session: ApiSession): Record<string, string> {
  return { Authorization: `Bearer ${session.accessToken}` };
}

async function workflowTasks(
  request: APIRequestContext,
  session: ApiSession,
): Promise<WorkflowTaskReference[]> {
  const response = await request.get(`${apiBaseUrl}/workflow/tasks`, {
    headers: authorization(session),
  });
  return expectJson<WorkflowTaskReference[]>(response, 200, 'GET /workflow/tasks');
}

async function taskForDocument(
  request: APIRequestContext,
  session: ApiSession,
  documentId: string,
): Promise<WorkflowTaskReference> {
  const task = (await workflowTasks(request, session)).find(
    (candidate) => candidate.documentId === documentId,
  );
  expect(task, `workflow task for ${documentId}`).toBeTruthy();
  return task!;
}

function shanghaiBusinessDate(daysAhead: number): string {
  const target = new Date(Date.now() + daysAhead * 86_400_000);
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(target)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
