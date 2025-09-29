import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Menu as MenuIcon, 
  Settings, 
  BarChart3, 
  QrCode, 
  Palette, 
  FileText,
  Image,
  Eye,
  X
} from 'lucide-react';

interface SidebarProps {
  currentPage?: string;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = memo(({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    {
      section: 'Tableau de bord',
      items: [
        { icon: Home, label: 'Accueil', path: '/', active: location.pathname === '/' },
        { icon: BarChart3, label: 'Statistiques' },
      ]
    },
    {
      section: 'Gestion du menu',
      items: [
        { icon: Palette, label: 'Identité visuelle', path: '/mon-menu', active: location.pathname === '/mon-menu' },
        { icon: FileText, label: 'Mon menu', path: '/categories', active: location.pathname === '/categories' },
        { icon: QrCode, label: 'QR Code', path: '/qr-code', active: location.pathname === '/qr-code' },
      ]
    },
    {
      section: 'Configuration',
      items: [
        { icon: Settings, label: 'Paramètres', path: '/account-settings', active: location.pathname === '/account-settings' },
      ]
    }
  ];

  return (
    <>
      <aside className={`
        bg-gray-900 w-64 min-h-screen fixed left-0 top-16 z-30 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:z-0
      `}>
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 lg:pt-4">
          {menuItems.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-6 lg:mb-8">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {section.section}
              </h3>
              <nav className="space-y-1">
                {section.items.map((item, itemIndex) => 
                  item.path ? (
                    <Link
                      key={itemIndex}
                      to={item.path}
                      onClick={onClose}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        item.active 
                          ? 'bg-orange-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <item.icon size={18} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={itemIndex}
                      onClick={onClose}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        item.active 
                          ? 'bg-orange-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <item.icon size={18} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  )
                )}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;