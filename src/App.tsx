import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import OnboardingPage from './components/Auth/OnboardingPage';
import AccountSettingsPage from './components/Auth/AccountSettingsPage';
import ResetPasswordPage from './components/Auth/ResetPasswordPage';
import MainLayout from './components/Layout/MainLayout';
import { Loader2 } from 'lucide-react';
import MonMenu from './components/Menu/MonMenu';
import MenuManagement from './components/Menu/MenuManagement';
import AIMenuImport from './components/Menu/AIMenuImport';
import QRCodePage from './components/Menu/QRCodePage';
import MenuPreview from './components/Menu/MenuPreview';
import WelcomeCard from './components/Dashboard/WelcomeCard';

function App() {
  const { loading, user } = useAuth();
  
  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/m/:slug" element={<MenuPreview />} />
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout currentPage="accueil">
              <WelcomeCard />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/mon-menu" element={
          <ProtectedRoute>
            <MainLayout currentPage="identite-visuelle">
              <MonMenu />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/categories" element={
          <ProtectedRoute>
            <MainLayout currentPage="mon-menu">
              <MenuManagement />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/import-ai" element={
          <ProtectedRoute>
            <MainLayout currentPage="import-ai">
              <AIMenuImport />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/qr-code" element={
          <ProtectedRoute>
            <MainLayout currentPage="qr-code">
              <QRCodePage />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/account-settings" element={
          <ProtectedRoute>
            <MainLayout currentPage="account-settings">
              <AccountSettingsPage />
            </MainLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;