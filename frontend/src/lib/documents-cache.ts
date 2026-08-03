import type { Document } from "@/lib/types";

/**
 * Lets a page show last-known results immediately on mount instead of
 * a blank "please wait" — the real fetch still always runs in the
 * background afterward and replaces this once it lands, so this is
 * only ever a placeholder for the few seconds a fresh fetch takes,
 * never a substitute for it. Same localStorage-persistence idea as
 * the upload queue in upload/page.tsx, applied here to the documents
 * list that both the dashboard and documents pages fetch on mount.
 *
 * Keyed by user id (not a fixed key) so switching accounts in the
 * same browser can't show one user's cached documents to another —
 * admin's full-platform list vs. a regular user's own-files-only list
 * are very different data.
 */

const CACHE_KEY_PREFIX = "docintel-documents-cache:";

interface CachedDocuments {
  documents: Document[];
  fetchedAt: number;
}

export function loadCachedDocuments(userId: string): CachedDocuments | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + userId);
    if (!raw) return null;
    return JSON.parse(raw) as CachedDocuments;
  } catch {
    return null;
  }
}

export function saveCachedDocuments(userId: string, documents: Document[]): void {
  const payload: CachedDocuments = { documents, fetchedAt: Date.now() };
  localStorage.setItem(CACHE_KEY_PREFIX + userId, JSON.stringify(payload));
}
