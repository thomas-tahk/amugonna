import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const user = { id: 1, email: 'a@b.co', firstName: 'Ada', lastName: 'L', createdAt: '' };
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.setItem('authToken', 'good');
  localStorage.setItem('user', JSON.stringify(user));
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('expired token mid-session', () => {
  it('a 401 on Cook returns to Sign in with "Please sign in again"', async () => {
    let authed = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.endsWith('/auth/profile')) return json(200, { success: true, data: { user } });
        if (!authed) return json(401, { success: false, message: 'Invalid or expired token' });
        if (u.includes('/ingredients/common')) return json(200, { success: true, data: { groups: [], staples: [] } });
        if (u.includes('/ingredients/user')) return json(200, { success: true, data: { ingredients: [] } });
        return json(200, { success: true, data: { cookNow: [] } });
      }),
    );
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Your kitchen' })).toBeInTheDocument();
    authed = false; // token expires while the tab is open
    await userEvent.click(screen.getByRole('button', { name: 'Cook' }));
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByText('Please sign in again')).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('authToken')).toBeNull());
  });
});
