import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BrandIcon } from './icons';
import { DEFAULT_TAB, TABS } from './tabs';
import type { TabId } from './tabs';

const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB);
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const Screen = active.Screen;

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
                onClick={() => setActiveTab(id)}
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
      <main className="app-main">
        <Screen key={active.id} onNavigate={setActiveTab} />
      </main>
    </div>
  );
};

export default AppShell;
