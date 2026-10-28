import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BrandIcon } from './icons';
import { TABS } from './tabs';
import { focusHeading } from './focus';
import { navigate, tabHash, useRoute } from './route';

const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  // The URL hash is the single source of truth for the tab (and the open recipe, see CookScreen).
  const { tab: activeTab } = useRoute();
  const mainRef = useRef<HTMLElement>(null);
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const Screen = active.Screen;

  // Fallback for screens that show their heading straight away: Kitchen and Cook focus their own
  // heading once their data has loaded.
  useEffect(() => {
    focusHeading(mainRef.current?.querySelector<HTMLElement>('h1, h2'));
  }, [activeTab]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="brand">
            <BrandIcon width={26} height={26} />
            Amugonna
          </h1>
          <nav className="tabs" aria-label="Main">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={id === activeTab ? 'page' : undefined}
                className="tab"
                onClick={() => navigate(tabHash(id))}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="header-spacer" />
          {user && <span className="user-greeting">Hi, {user.firstName}</span>}
          <button type="button" className="btn btn-signout" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="app-main" ref={mainRef}>
        <Screen key={active.id} onNavigate={(id) => navigate(tabHash(id))} />
      </main>
    </div>
  );
};

export default AppShell;
