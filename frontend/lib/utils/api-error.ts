import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

type ApiErrorBody = { message?: string | string[] };

/**
 * Normalizes any RTK Query error (or unknown thrown value) into a single
 * human-readable string. Use everywhere we surface an error to the user —
 * page error states (via ErrorState) and mutation catch blocks (via toast) —
 * so messages stay consistent and never render `[object Object]`/`undefined`.
 */
export function getErrorMessage(
  error: FetchBaseQueryError | SerializedError | unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!error || typeof error !== 'object') return fallback;

  // RTK Query FetchBaseQueryError has a `status` field.
  if ('status' in error) {
    const e = error as FetchBaseQueryError;

    // Transport-level failures (server down, CORS, DNS, offline).
    if (e.status === 'FETCH_ERROR') {
      return 'Network error — please check your connection and try again.';
    }
    if (e.status === 'TIMEOUT_ERROR') {
      return 'The request timed out. Please try again.';
    }
    if (e.status === 'PARSING_ERROR') {
      return 'We received an unexpected response. Please try again.';
    }

    // HTTP errors — prefer the backend's own message when present.
    const body = e.data as ApiErrorBody | undefined;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message[0] : body.message;
    }
    if (e.status === 401) return 'Your session has expired. Please sign in again.';
    if (e.status === 403) return 'You don’t have permission to do that.';
    if (e.status === 404) return 'We couldn’t find what you were looking for.';
    if (typeof e.status === 'number' && e.status >= 500) {
      return 'The server ran into a problem. Please try again shortly.';
    }
  }

  // SerializedError (thrown JS error inside a query/mutation).
  if ('message' in error && typeof (error as SerializedError).message === 'string') {
    return (error as SerializedError).message as string;
  }

  return fallback;
}
