export type Role = "user" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

const TOKEN_KEY = "docintel-token";
const USER_KEY = "docintel-user";

// Shared with upload/page.tsx (imported from here, not redefined
// there) so clearSession can wipe it below — the upload queue used
// to survive a logout/login cycle indefinitely, showing the previous
// session's files to whoever logged in next.
export const UPLOAD_QUEUE_KEY = "docintel-upload-queue";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(UPLOAD_QUEUE_KEY);
}
