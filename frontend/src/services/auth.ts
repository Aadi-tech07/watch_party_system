import { AuthUser } from '../types';
import { BACKEND_URL } from './socket';

const TOKEN_KEY = 'watchparty_auth_token';
const USER_KEY = 'watchparty_auth_user';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function safeFetchJson(url: string, options: RequestInit = {}): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch {
    throw new ApiError(
      `Could not connect to the backend at ${BACKEND_URL}. Make sure the server is running and CORS allows this origin.`
    );
  }

  const text = await res.text();
  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(
        `Server at ${BACKEND_URL} returned HTTP ${res.status} with a non-JSON response. Check that the backend URL/port is correct.`,
        res.status
      );
    }
  }

  if (!res.ok) {
    throw new ApiError(data.error || data.message || `Request failed with status ${res.status}.`, res.status);
  }

  return data;
}

async function authRequest(
  path: 'login' | 'register',
  username: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const data = await safeFetchJson(`${BACKEND_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password })
  });

  if (!data.token || !data.user) {
    throw new ApiError('Server response was missing the token or user.');
  }

  saveAuthSession(data.token, data.user);
  return { token: data.token, user: data.user };
}

export const loginApi = (username: string, password: string) => authRequest('login', username, password);
export const registerApi = (username: string, password: string) => authRequest('register', username, password);

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const data = await safeFetchJson(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    saveAuthSession(token, data.user);
    return data.user;
  } catch (err) {
    // Only drop the session when the server says the token is invalid.
    // If the server is simply unreachable, keep the user signed in.
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      clearAuthSession();
      return null;
    }
    return getStoredUser();
  }
}

export async function logoutApi(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  clearAuthSession();
}