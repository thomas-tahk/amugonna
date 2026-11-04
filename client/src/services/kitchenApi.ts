import type { ApiResponse, UserIngredient } from '../types';
import { ADD_FAILED_MESSAGE, GENERIC_MESSAGE, NETWORK_MESSAGE, READ_FAILED_MESSAGE, notifyUnauthorized, plainServerMessage } from './http';
import type { BulkResult, CommonData, ParsedItem, SuggestItem } from '../types/kitchen';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

/** Calls the API and returns `data`; throws an Error with a readable message on any failure. */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  badRequestMessage?: string,
): Promise<T> {
  const token = localStorage.getItem('authToken');
  let body: ApiResponse<T>;
  let status: number | undefined;
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    status = res.status;
    body = await res.json();
  } catch {
    throw new Error(NETWORK_MESSAGE);
  }
  if (status === 401 && token) notifyUnauthorized();
  if (!body.success || body.data === undefined) {
    if (status === 400 && badRequestMessage) throw new Error(badRequestMessage);
    throw new Error(plainServerMessage(status, body.message) || GENERIC_MESSAGE);
  }
  return body.data;
}

export const kitchenApi = {
  common: () => request<CommonData>('/ingredients/common'),

  suggest: async (q: string, limit = 8): Promise<SuggestItem[]> =>
    (await request<{ items: SuggestItem[] }>(`/ingredients/suggest?q=${encodeURIComponent(q)}&limit=${limit}`)).items,

  pantry: async (): Promise<UserIngredient[]> =>
    (await request<{ ingredients: UserIngredient[] }>('/ingredients/user')).ingredients,

  parse: async (text: string): Promise<ParsedItem[]> =>
    (
      await request<{ items: ParsedItem[] }>('/ingredients/user/parse', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }, READ_FAILED_MESSAGE)
    ).items,

  /** Number of recipes cookable right now (GET /recipes/suggestions -> data.cookNow). */
  cookNowCount: async (): Promise<number> =>
    (await request<{ cookNow: unknown[] }>('/recipes/suggestions')).cookNow.length,

  /** `keepalive` lets the request outlive the page (used when the tab is being closed or reloaded). */
  bulk: (change: { add?: (number | string)[]; remove?: number[] }, opts: { keepalive?: boolean } = {}) =>
    request<BulkResult>(
      '/ingredients/user/bulk',
      {
        method: 'POST',
        body: JSON.stringify(change),
        ...(opts.keepalive && { keepalive: true }),
      },
      ADD_FAILED_MESSAGE,
    ),
};
