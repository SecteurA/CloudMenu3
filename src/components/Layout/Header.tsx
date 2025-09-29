import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, Settings, LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = memo(({ onMenuToggle }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    try {
      await signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, forcer le rechargement de la page
      window.location.reload();
    }
  };

  // Extraire le nom de l'email ou utiliser "Utilisateur"
  const displayName = user?.email?.split('@')[0] || 'Utilisateur';
  const email = user?.email || '';

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 fixed top-0 left-0 right-0 z-30">
      {/* Left side - Menu button and Logo */}
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <div className="flex items-center">
          <img 
            src="https://pub-f75ac4351c874e6f945cfc0ccd7d6d35.r2.dev/CloudMenu/CloudMenu.svg" 
            alt="CloudMenu" 
            className="h-6 sm:h-8"
          />
        </div>
      </div>

      {/* Right side - Notifications and Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Notification Bell */}
        <div className="relative">
          <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={18} className="sm:w-5 sm:h-5" />
          </button>
          {/* Notification badge */}
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium text-[10px] sm:text-xs">
            3
          </span>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-2 sm:space-x-3 p-1 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <User size={14} className="sm:w-[18px] sm:h-[18px] text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-gray-900 capitalize">{displayName}</div>
              <div className="text-xs text-gray-500 max-w-[120px] truncate">{email}</div>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100 sm:hidden">
                <div className="text-sm font-medium text-gray-900 capitalize">{displayName}</div>
                <div className="text-sm text-gray-500">{email}</div>
                <div className="text-xs text-orange-600 font-medium mt-1">Restaurant configuré</div>
              </div>
              
              <div className="py-1">
                <Link to="/account-settings" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3">
                  <Settings size={16} />
                  <span>Paramètres du compte</span>
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center space-x-3"
                >
                  <LogOut size={16} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop for closing dropdown */}
      {isProfileOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsProfileOpen(false)}
        />
      )}
    </header>
  );
});

Header.displayName = 'Header';
export default Header;