import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRememberedLogin, saveRememberedLogin } from './remember-login';

function createStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe('remember-login', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
  });

  it('默认返回未记住状态', () => {
    expect(loadRememberedLogin()).toEqual({ remember: false, username: '' });
  });

  it('勾选记住登录后保存并可恢复账号', () => {
    saveRememberedLogin(true, 'zhangsan');
    expect(loadRememberedLogin()).toEqual({ remember: true, username: 'zhangsan' });
  });

  it('取消记住登录时清除已保存的账号', () => {
    saveRememberedLogin(true, 'zhangsan');
    saveRememberedLogin(false, 'zhangsan');
    expect(loadRememberedLogin()).toEqual({ remember: false, username: '' });
  });

  it('账号为空时不保存', () => {
    saveRememberedLogin(true, '');
    expect(loadRememberedLogin()).toEqual({ remember: false, username: '' });
  });

  it('存储内容损坏时回退为未记住状态', () => {
    localStorage.setItem('oa-remember-login', '{broken');
    expect(loadRememberedLogin()).toEqual({ remember: false, username: '' });
  });
});
