// Stub of the host app's auth slice — only the `logout` action is used by
// base-api.ts's 401 handling. Replace with your app's real auth slice/action.
import { createAction } from '@reduxjs/toolkit';

export const logout = createAction('auth/logout');
