import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kitchenApi } from './kitchenApi';
import { cookApi } from './cookApi';
import { authApi } from './api';
import { setUnauthorizedHandler } from './http';
import { parseHash } from '../components/shell/route';

const res = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
let unauthorized: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.setItem('authToken', 'tok');
  unauthorized = vi.fn();
  setUnauthorizedHandler(unauthorized);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
  localStorage.clear();
});

describe('plain-language errors', () => {
  it('network failure -> Cant reach Amugonna (kitchen, cook, auth)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const msg = "Can't reach Amugonna. Check your connection and try again.";
    await expect(kitchenApi.pantry()).rejects.toThrow(msg);
    await expect(cookApi.getSuggestions()).rejects.toThrow(msg);
    expect((await authApi.login({ email: 'a@b.co', password: 'x' })).message).toBe(msg);
  });

  it('400 on add -> try a shorter name; parse has its own plain message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(400, { success: false, message: 'Validation failed' })));
    await expect(kitchenApi.bulk({ add: ['x'] })).rejects.toThrow("Couldn't add that. Try a shorter name.");
    await expect(kitchenApi.parse('x')).rejects.toThrow("Couldn't read that. Try fewer or shorter items.");
  });

  it('a bare "Validation failed" or a 500 never reaches the screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(500, { success: false, message: 'Internal server error: prisma' })));
    await expect(kitchenApi.pantry()).rejects.toThrow('Something went wrong. Please try again.');
    await expect(cookApi.getSuggestions()).rejects.toThrow('Something went wrong. Please try again.');
  });

  it('sign-up "Validation failed" becomes a password hint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(400, { success: false, message: 'Validation failed' })));
    const r = await authApi.register({ email: 'a@b.co', password: 'alllowercase', firstName: 'A', lastName: 'B' });
    expect(r.message).toMatch(/password needs 8 or more characters/);
  });

  it('auth errors keep the server text and do not count as an expired session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(401, { success: false, message: 'Invalid email or password' })));
    expect((await authApi.login({ email: 'a@b.co', password: 'x' })).message).toBe('Invalid email or password');
    expect(unauthorized).not.toHaveBeenCalled();
  });
});

describe('401 with a token ends the session', () => {
  it.each([
    ['kitchenApi', () => kitchenApi.pantry()],
    ['cookApi', () => cookApi.getSuggestions()],
    ['api.ts', () => authApi.getProfile('tok')],
  ])('%s', async (_n, call) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(401, { success: false, message: 'Invalid or expired token' })));
    await Promise.resolve(call()).catch(() => undefined);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });
});

describe('route hash', () => {
  it('parses tabs and the open recipe', () => {
    expect(parseHash('')).toEqual({ tab: 'kitchen', recipeId: null });
    expect(parseHash('#cook')).toEqual({ tab: 'cook', recipeId: null });
    expect(parseHash('#recipes')).toEqual({ tab: 'recipes', recipeId: null });
    expect(parseHash('#cook/recipe/42')).toEqual({ tab: 'cook', recipeId: 42 });
    expect(parseHash('#kitchen/recipe/42')).toEqual({ tab: 'kitchen', recipeId: null });
    expect(parseHash('#nonsense')).toEqual({ tab: 'kitchen', recipeId: null });
  });
});
