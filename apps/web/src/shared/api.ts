import type { SessionUser } from '@oa/contracts';

const tokenKey = 'oa-token';

export interface ApiEnvelope<T> {
  data: T;
  document: {
    id: string;
    documentType: string;
    title: string;
    status: string;
    revision: number;
  };
  opinions: Array<{
    id: string;
    action: string;
    actorName: string;
    comment: string;
    createdAt: string;
  }>;
}

export function getToken(): string | null {
  return localStorage.getItem(tokenKey);
}

export function setToken(token: string): void {
  localStorage.setItem(tokenKey, token);
}

type JsonRequestInit = Omit<RequestInit, 'body'> & { body?: BodyInit | Record<string, unknown> };

export async function apiRequest<T>(path: string, init: JsonRequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  let body = init.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  const response = await fetch(`/api/v1${path}`, { ...init, headers, body });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? '请求失败');
  }
  return payload;
}

export async function login(username: string, password: string): Promise<SessionUser> {
  const result = await apiRequest<{ accessToken: string; user: SessionUser }>('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  setToken(result.accessToken);
  return result.user;
}

export function requestId(): string {
  return crypto.randomUUID();
}
