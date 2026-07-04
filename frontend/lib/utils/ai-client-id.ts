const CLIENT_ID_KEY = 'gosellr_ai_client_id';

/**
 * Stable per-browser id used to rate-limit the AI assistant for guests (who
 * have no user id). Generated once and persisted in localStorage; logged-in
 * requests use the real user id instead (see ai-assistant.api.ts).
 */
export function getAiClientId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}
