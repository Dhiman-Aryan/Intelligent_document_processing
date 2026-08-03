import { api } from "@/lib/api";
import {
  clearSession,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
  type AuthUser,
  type Role,
} from "@/lib/auth-storage";

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export type { AuthUser, Role };

export async function signup(name: string, email: string, password: string): Promise<AuthUser> {
  const response = await api.post<TokenResponse>("/auth/signup", { name, email, password });
  setToken(response.access_token);
  setStoredUser(response.user);
  return response.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await api.post<TokenResponse>("/auth/login", { email, password });
  setToken(response.access_token);
  setStoredUser(response.user);
  return response.user;
}

export function logout() {
  clearSession();
}

/** Sync, storage-only check — used by the auth guard before every protected page renders. */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function getCurrentUser(): AuthUser | null {
  return getStoredUser();
}
