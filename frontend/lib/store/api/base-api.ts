// Trimmed from the host app's lib/store/api/base-api.ts — the RTK Query base
// the ai-assistant.api.ts slice injects into. The host app's real version
// also carries tagTypes for its other domains (Product, Order, Cart, ...);
// none of that is needed here, so it's dropped. Wire `authSlice`'s shape to
// whatever your app already uses.
import {
  createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '../root-state';
import { logout } from '../auth.slice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    const { auth } = api.getState() as RootState;
    if (auth.isAuthenticated) api.dispatch(logout());
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});
