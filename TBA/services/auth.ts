export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  provider: 'google' | 'facebook' | 'github' | string;
  loggedInAt?: string;
}

const AUTH_USER_KEY = 'tba_auth_user';

/**
 * Returns currently stored user from localStorage
 */
export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to read auth user from localStorage:', e);
    return null;
  }
}

/**
 * Persists user state in localStorage
 */
export function setStoredUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch (e) {
    console.error('Failed to write auth user to localStorage:', e);
  }
}

function getProviderDisplayName(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'google':
      return 'משתמש Google';
    case 'facebook':
      return 'משתמש Facebook';
    case 'github':
      return 'משתמש GitHub';
    default:
      return 'משתמש מחובר';
  }
}

/**
 * Login function that sends auth request to backend /auth/login,
 * handles API response, creates user record, and caches it locally.
 * Throws an error on network/server failure without inventing fallback users.
 */
export async function loginWithProvider(provider: string): Promise<AuthUser> {
  const formData = new FormData();
  formData.append('auth_provider', provider);

  let res: Response;
  try {
    res = await fetch('/auth/login', {
      method: 'POST',
      body: formData,
    });
  } catch (netError) {
    console.error('Network request to /auth/login failed:', netError);
    throw new Error('לא ניתן להתחבר כעת. שגיאת תקשורת מול שרת ההתחברות.');
  }

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    const errorMsg = errJson?.error || errJson?.message || 'התחברות נכשלה. נא לנסות שוב.';
    throw new Error(errorMsg);
  }

  const data = await res.json().catch(() => null);
  if (!data) {
    throw new Error('תשובת שרת ההתחברות אינה תקינה.');
  }

  const user: AuthUser = {
    id: data.user_id || data.id || data.userId || '',
    name: data.name || data.username || getProviderDisplayName(provider),
    email: data.email || '',
    avatar: data.avatar || data.picture || '',
    provider: provider,
    loggedInAt: new Date().toISOString(),
  };

  if (!user.id) {
    throw new Error('מזהה משתמש לא התקבל משרת ההתחברות.');
  }

  setStoredUser(user);
  return user;
}

/**
 * Logout function that clears session locally and optionally calls /auth/logout
 */
export async function logoutUser(): Promise<void> {
  try {
    await fetch('/auth/logout', { method: 'POST' }).catch(() => null);
  } finally {
    setStoredUser(null);
  }
}
