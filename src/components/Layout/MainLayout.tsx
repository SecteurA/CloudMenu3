import React, { useState, memo, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

const MainLayout = memo(({ children, currentPage }: MainLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = useCallback(() => {
    if (sidebarOpen) {
      closeSidebar();
    }
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuToggle={toggleSidebar} />
      
      <Sidebar 
        currentPage={currentPage} 
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={handleOverlayClick}
        />
      )}
      
      {/* Main content */}
      <main className="lg:ml-64 pt-16 transition-all duration-300">
        <div className="p-3 sm:p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
});

MainLayout.displayName = 'MainLayout';
export default MainLayout;