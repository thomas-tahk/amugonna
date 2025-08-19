import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import PantryManager from './components/PantryManager';
import './App.css';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading Amugonna...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🍽️ Amugonna</h1>
          <p className="app-subtitle">Find recipes based on what you have</p>
          
          {isAuthenticated && user && (
            <div className="user-info">
              <span>Welcome, {user.firstName}!</span>
              <button onClick={logout} className="logout-btn">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {isAuthenticated ? (
          <PantryManager />
        ) : (
          <AuthForm />
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2025 Amugonna. Your personal recipe assistant.</p>
      </footer>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
