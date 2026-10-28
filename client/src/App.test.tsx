import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const authState = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => authState.value,
}));
vi.mock('./components/kitchen/KitchenScreen', () => ({
  default: () => <div data-testid="screen-kitchen">KitchenScreen screen</div>,
}));
vi.mock('./components/cook/CookScreen', () => ({
  default: () => <div data-testid="screen-cook">CookScreen screen</div>,
}));
vi.mock('./components/RecipeManager', () => ({
  default: () => <div data-testid="screen-recipes">RecipeManager screen</div>,
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
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('renders the three nav buttons, Kitchen current by default', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const buttons = within(nav).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Kitchen', 'Cook', 'My recipes']);
    expect(screen.getByRole('button', { name: 'Kitchen' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Cook' })).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('screen-kitchen')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('switches the screen when a nav button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Cook' }));
    expect(screen.getByRole('button', { name: 'Cook' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Kitchen' })).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('screen-cook')).toBeInTheDocument();
    expect(screen.queryByTestId('screen-kitchen')).not.toBeInTheDocument();
  });

  it('maps My recipes to its own screen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'My recipes' }));
    expect(screen.getByRole('button', { name: 'My recipes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('screen-recipes')).toBeInTheDocument();
    expect(screen.queryByTestId('screen-kitchen')).not.toBeInTheDocument();
  });

  it('can be driven by keyboard: Tab to a nav button, Enter activates it', async () => {
    const user = userEvent.setup();
    render(<App />);
    const cook = screen.getByRole('button', { name: 'Cook' });
    // Tab order in the header: Kitchen, Cook, My recipes, Sign out
    await user.tab();
    await user.tab();
    expect(cook).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(cook).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('screen-cook')).toBeInTheDocument();
  });

  it('calls logout from Sign out', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signedIn.logout).toHaveBeenCalled();
  });
});
