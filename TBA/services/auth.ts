export interface AuthUser {
  id: string;
  name: string;
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

/**
 * Initiates top-level browser navigation to /auth/login with selected provider.
 * This submits a POST request via form submission so the browser follows
 * the server's 307 redirect to the provider's OAuth consent screen.
 */
export async function triggerOAuthLogin(provider: string): Promise<void> {
const formData = new FormData();
  formData.append('auth_provider', provider);

  let res: Response;
  try {
    res = await fetch('/auth/login', {
      method: 'POST',
      body: formData,
    });
    if(!res.ok) {
      throw new Error("Something when wrong")
    }
    const redirectURL = await res.text()
    window.location.assign(redirectURL)

  } catch (netError) {
    console.error('Network request to /auth/login failed:', netError);
    throw new Error('לא ניתן להתחבר כעת. שגיאת תקשורת מול שרת ההתחברות.');
  }

  if (!!res && !res.ok) {
    const errJson = await res.json().catch(() => null);
    const errorMsg = errJson?.error || errJson?.message || 'התחברות נכשלה. נא לנסות שוב.';
    throw new Error(errorMsg);
  }
}

/**
 * Fetches current authenticated user profile from /api/me using session cookie.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/me', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      setStoredUser(null);
      return null;
    }
    const data = await res.json();
    if (data && data.name) {
      const user: AuthUser = {
        id: data.id || data.user_id || '',
        name: data.name,
      };
      setStoredUser(user);
      return user;
    }
    setStoredUser(null);
    return null;
  } catch (e) {
    console.warn('Failed to fetch user session:', e);
    return getStoredUser();
  }
}

/**
 * Logout function that clears session on server and locally
 */
export async function logoutUser(): Promise<void> {
  try {
    await fetch('/auth/logout', { method: 'POST' }).catch(() => null);
  } finally {
    setStoredUser(null);
  }
}
