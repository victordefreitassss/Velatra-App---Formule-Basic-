import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Simple clean route translation
  const renderContent = () => {
    switch (currentPath) {
      case '/login':
        return <LoginPage />;
      case '/register':
        return <RegisterPage />;
      case '/':
      default:
        return (
          <div className="flex flex-col min-h-screen bg-white text-zinc-900 antialiased">
            <Navbar />
            <main className="flex-grow">
              <HomePage />
            </main>
            <Footer />
          </div>
        );
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {renderContent()}
    </div>
  );
}

export default App;
// For older react-router bundlers
