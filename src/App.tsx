import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import OnboardingPage from './components/Auth/OnboardingPage';
import AccountSettingsPage from './components/Auth/AccountSettingsPage';
import ResetPasswordPage from './components/Auth/ResetPasswordPage';
import MainLayout from './components/Layout/MainLayout';
import LoadingSpinner from './components/Layout/LoadingSpinner';
import MonMenu from './components/Menu/MonMenu';
import MenuManagement from './components/Menu/MenuManagement';
import MenuListPage from './components/Menu/MenuListPage';
import AIMenuImport from './components/Menu/AIMenuImport';
import QRCodePage from './components/Menu/QRCodePage';
import RestaurantMenuSelection from './components/Menu/RestaurantMenuSelection';
import MenuPreview from './components/Menu/MenuPreview';
import RestaurantReservation from './components/Menu/RestaurantReservation';
import RestaurantContact from './components/Menu/RestaurantContact';
import RestaurantIdentity from './components/Restaurant/RestaurantIdentity';
import WelcomeCard from './components/Dashboard/WelcomeCard';
import ReservationsPage from './components/Reservations/ReservationsPage';

function App() {
  const { loading, user } = useAuth();

  // Show loading while auth is initializing
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/m/:slug" element={<RestaurantMenuSelection />} />
        <Route path="/m/:slug/:menuSlug" element={<MenuPreview />} />
        <Route path="/m/:slug/reservation" element={<RestaurantReservation />} />
        <Route path="/m/:slug/contact" element={<RestaurantContact />} />
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout currentPage="accueil">
              <WelcomeCard />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/mes-menus" element={
          <ProtectedRoute>
            <MainLayout currentPage="mes-menus">
              <MenuListPage />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/mon-menu/nouveau" element={
          <ProtectedRoute>
            <MainLayout currentPage="mes-menus">
              <MonMenu />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/mon-menu/:menuId" element={
          <ProtectedRoute>
            <MainLayout currentPage="mes-menus">
              <MonMenu />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/categories/:menuId" element={
          <ProtectedRoute>
            <MainLayout currentPage="mes-menus">
              <MenuManagement />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/import-ai/:menuId" element={
          <ProtectedRoute>
            <MainLayout currentPage="mes-menus">
              <AIMenuImport />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/identite-visuelle" element={
          <ProtectedRoute>
            <MainLayout currentPage="identite-visuelle">
              <RestaurantIdentity />
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
        <Route path="/reservations" element={
          <ProtectedRoute>
            <MainLayout currentPage="reservations">
              <ReservationsPage />
            </MainLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;