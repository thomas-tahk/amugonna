import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import AppShell from './components/shell/AppShell';
import { BrandIcon } from './components/shell/icons';
import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-screen" role="status">
          <div className="loading-spinner"></div>
          <p>Loading Amugonna...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="app-header-inner">
            <h1 className="brand">
              <BrandIcon width={26} height={26} />
              Amugonna
            </h1>
          </div>
        </header>
        <main className="app-main app-main-auth">
          <AuthForm />
        </main>
      </div>
    );
  }

  return <AppShell />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
