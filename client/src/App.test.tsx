import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const authState = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => authState.value,
}));
vi.mock('./components/PantryManager', () => ({
  default: () => <div>PantryManager screen</div>,
}));
vi.mock('./components/RecipeManager', () => ({
  default: () => <div>RecipeManager screen</div>,
}));

import App from './App';

const signedIn = {
  user: { id: 1, email: 'a@b.co', firstName: 'Ada', lastName: 'L', createdAt: '' },
  token: 't',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
};

describe('App shell', () => {
  beforeEach(() => {
    authState.value = { ...signedIn };
  });

  it('shows the auth form when signed out', () => {
    authState.value = { ...signedIn, user: null, token: null, isAuthenticated: false };
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('renders the three tabs, Kitchen selected by default', () => {
    render(<App />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Kitchen', 'Cook', 'My recipes']);
    expect(screen.getByRole('tab', { name: 'Kitchen' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('PantryManager screen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('switches the panel when a tab is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Cook' }));
    expect(screen.getByRole('tab', { name: 'Cook' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('RecipeManager screen')).toBeInTheDocument();
    expect(screen.queryByText('PantryManager screen')).not.toBeInTheDocument();
  });

  it('calls logout from Sign out', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signedIn.logout).toHaveBeenCalled();
  });
});
