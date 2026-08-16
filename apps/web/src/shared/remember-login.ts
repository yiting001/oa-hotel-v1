const rememberKey = 'oa-remember-login';

export interface RememberedLogin {
  remember: boolean;
  username: string;
}

export function loadRememberedLogin(): RememberedLogin {
  try {
    const raw = localStorage.getItem(rememberKey);
    if (!raw) return { remember: false, username: '' };
    const parsed = JSON.parse(raw) as Partial<RememberedLogin>;
    if (parsed.remember !== true || typeof parsed.username !== 'string') {
      return { remember: false, username: '' };
    }
    return { remember: true, username: parsed.username };
  } catch {
    return { remember: false, username: '' };
  }
}

export function saveRememberedLogin(remember: boolean, username: string): void {
  if (remember && username) {
    localStorage.setItem(rememberKey, JSON.stringify({ remember: true, username }));
  } else {
    localStorage.removeItem(rememberKey);
  }
}
