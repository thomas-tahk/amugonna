import type { CookRecipe, Suggestions } from '../types/cook';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

async function get<T>(endpoint: string): Promise<T> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  let body: { success?: boolean; message?: string; data?: T } | null = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok || !body?.success || !body.data) {
    throw new Error(body?.message || 'Something went wrong. Please try again.');
  }
  return body.data;
}

export const cookApi = {
  getSuggestions: () => get<Suggestions>('/recipes/suggestions'),
  getRecipe: async (id: number): Promise<CookRecipe> =>
    (await get<{ recipe: CookRecipe }>(`/recipes/${id}`)).recipe,
};
