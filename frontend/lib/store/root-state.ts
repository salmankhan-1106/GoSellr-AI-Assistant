// Stub of the host app's combined Redux state shape — only the `auth` slice
// is needed by the AI-assistant files. Replace with your app's real
// RootState (e.g. `ReturnType<typeof store.getState>`).
export interface RootState {
  auth: {
    token: string | null;
    isAuthenticated: boolean;
    isHydrated: boolean;
  };
}
