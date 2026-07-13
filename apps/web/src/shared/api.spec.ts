import { describe, expect, it } from 'vitest';
import { requestId } from './api';

describe('requestId', () => {
  it('generates an idempotency key', () => {
    expect(requestId()).toMatch(/^[0-9a-f-]{36}$/);
  });
});
