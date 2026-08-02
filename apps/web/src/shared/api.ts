import type { SessionUser } from '@oa/contracts';

const tokenKey = 'oa-token';
export const unauthorizedEventName = 'oa:unauthorized';
let authGeneration = 0;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
    readonly traceId: string | null,
    readonly details: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

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
  authGeneration += 1;
}

export function clearToken(): void {
  localStorage.removeItem(tokenKey);
  authGeneration += 1;
}

export function getAuthGeneration(): number {
  return authGeneration;
}

type JsonRequestInit = Omit<RequestInit, 'body'> & { body?: BodyInit | Record<string, unknown> };

export async function apiRequest<T>(path: string, init: JsonRequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  const requestGeneration = getAuthGeneration();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  let body = init.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  const response = await fetch(`/api/v1${path}`, { ...init, headers, body });
  const responseText = await response.text();
  const payload: unknown = responseText ? JSON.parse(responseText) : {};
  if (!response.ok) {
    const errorPayload = payload as ErrorPayload;
    if (
      response.status === 401 &&
      requestGeneration === getAuthGeneration() &&
      token === getToken()
    ) {
      clearToken();
      if (path !== '/auth/login' && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(unauthorizedEventName));
      }
    }
    throw new ApiRequestError(
      normalizeMessage(errorPayload.message),
      response.status,
      errorPayload.code ?? null,
      errorPayload.traceId ?? null,
      errorPayload.details ?? {},
    );
  }
  return payload as T;
}

export async function login(username: string, password: string): Promise<SessionUser> {
  const requestGeneration = getAuthGeneration();
  const result = await apiRequest<{ accessToken: string; user: SessionUser }>('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  if (requestGeneration !== getAuthGeneration()) {
    throw new ApiRequestError('登录上下文已变更，请重试', 409, 'AUTH_CONTEXT_CHANGED', null, {});
  }
  setToken(result.accessToken);
  return result.user;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<SessionUser> {
  const requestGeneration = getAuthGeneration();
  const result = await apiRequest<{ accessToken: string; user: SessionUser }>('/auth/me/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
  });
  if (requestGeneration !== getAuthGeneration()) {
    throw new ApiRequestError('登录上下文已变更，请重试', 409, 'AUTH_CONTEXT_CHANGED', null, {});
  }
  setToken(result.accessToken);
  return result.user;
}

export function requestId(): string {
  return crypto.randomUUID();
}

interface ErrorPayload {
  code?: string;
  message?: string | string[];
  details?: Record<string, unknown>;
  traceId?: string;
}

function normalizeMessage(message: ErrorPayload['message']): string {
  if (Array.isArray(message)) {
    return message.join('；');
  }
  return message ?? '请求失败，请稍后重试';
}
