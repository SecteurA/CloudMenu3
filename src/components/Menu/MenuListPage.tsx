import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, CreditCard as Edit, QrCode, Trash2, Copy, Globe, FileText, Settings, List } from 'lucide-react';
import { supabase, Menu, generateSlug } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Layout/LoadingSpinner';

const LANGUAGES = {
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  it: { name: 'Italiano', flag: '🇮🇹' }
};

export default function MenuListPage() {
  const { user } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadMenus();
    }
  }, [user]);

  const loadMenus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMenus(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des menus:', error);
      showMessage('error', 'Erreur lors du chargement des menus');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const deleteMenu = async (menuId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce menu ? Toutes les catégories et plats associés seront également supprimés.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', menuId);

      if (error) throw error;

      setMenus(menus.filter(m => m.id !== menuId));
      showMessage('success', 'Menu supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showMessage('error', 'Erreur lors de la suppression du menu');
    }
  };

  const duplicateMenu = async (menu: Menu) => {
    try {
      const { id, created_at, updated_at, slug, ...menuData } = menu;
      const newMenu = {
        ...menuData,
        menu_name: `${menu.menu_name || menu.nom} (Copie)`,
        slug: '',
        status: 'draft'
      };

      const { data, error } = await supabase
        .from('menus')
        .insert([newMenu])
        .select()
        .single();

      if (error) throw error;

      setMenus([data, ...menus]);
      showMessage('success', 'Menu dupliqué avec succès (brouillon)');
    } catch (error) {
      console.error('Erreur lors de la duplication:', error);
      showMessage('error', 'Erreur lors de la duplication du menu');
    }
  };

  const toggleStatus = async (menu: Menu, field: 'actif' | 'status') => {
    try {
      let updates: any;

      if (field === 'actif') {
        updates = { actif: !menu.actif };
      } else {
        const isPublishing = menu.status === 'draft';
        updates = { status: isPublishing ? 'published' : 'draft' };

        if (isPublishing && !menu.slug) {
          const { data: profileData } = await supabase
            .from('restaurant_profiles')
            .select('slug')
            .eq('user_id', menu.user_id)
            .maybeSingle();

          const restaurantSlug = profileData?.slug || generateSlug(menu.nom);
          const menuSlugPart = generateSlug(menu.menu_name || menu.nom);
          updates.slug = `${restaurantSlug}/${menuSlugPart}`;
        }
      }

      const { error } = await supabase
        .from('menus')
        .update(updates)
        .eq('id', menu.id);

      if (error) throw error;

      setMenus(menus.map(m => m.id === menu.id ? { ...m, ...updates } : m));
      showMessage('success', 'Statut mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      showMessage('error', 'Erreur lors de la mise à jour du statut');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
        {message && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg flex items-center space-x-2 text-sm sm:text-base ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mes Menus</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              Gérez tous vos menus de restaurant
            </p>
          </div>
          <Link
            to="/mon-menu/nouveau"
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2 text-sm sm:text-base w-fit"
          >
            <Plus size={18} />
            <span>Créer un nouveau menu</span>
          </Link>
        </div>

        {menus.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun menu</h3>
            <p className="mt-2 text-sm text-gray-600 px-4">
              Commencez par créer votre premier menu pour votre restaurant.
            </p>
            <Link
              to="/mon-menu/nouveau"
              className="mt-6 inline-flex items-center space-x-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
            >
              <Plus size={18} />
              <span>Créer mon premier menu</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {menus.map((menu) => (
                <div
                  key={menu.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {menu.banniere_url ? (
                    <div className="h-32 bg-gray-200">
                      <img
                        src={menu.banniere_url}
                        alt={menu.menu_name || menu.nom}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">
                        {(menu.menu_name || menu.nom).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {menu.menu_name || menu.nom}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl">{LANGUAGES[menu.language || 'fr']?.flag}</span>
                          <span className="text-xs text-gray-500">
                            {LANGUAGES[menu.language || 'fr']?.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStatus(menu, 'status')}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            menu.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {menu.status === 'published' ? 'Publié' : 'Brouillon'}
                        </button>
                        <button
                          onClick={() => toggleStatus(menu, 'actif')}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            menu.actif
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {menu.actif ? 'Actif' : 'Inactif'}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap mt-4">
                      <Link
                        to={`/categories/${menu.id}`}
                        className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 text-sm bg-orange-600 text-white hover:bg-orange-700 px-3 py-2.5 rounded font-medium shadow-sm"
                      >
                        <List size={16} />
                        <span>Gérer les articles</span>
                      </Link>
                      <Link
                        to={`/mon-menu/${menu.id}`}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-1 text-sm text-gray-700 hover:bg-gray-50 px-3 py-2 rounded border border-gray-300"
                      >
                        <Settings size={16} />
                        <span>Paramètres</span>
                      </Link>
                      <button
                        onClick={() => duplicateMenu(menu)}
                        className="flex items-center justify-center gap-1 text-sm text-gray-700 hover:bg-gray-50 px-3 py-2 rounded border border-gray-300"
                      >
                        <Copy size={16} />
                        <span>Dupliquer</span>
                      </button>
                      <button
                        onClick={() => deleteMenu(menu.id)}
                        className="flex items-center justify-center gap-1 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded border border-red-200"
                      >
                        <Trash2 size={16} />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop List View */}
            <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom du menu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visibilité
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {menus.map((menu) => (
                    <tr key={menu.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {menu.banniere_url ? (
                            <img
                              src={menu.banniere_url}
                              alt={menu.menu_name || menu.nom}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                              <span className="text-white text-lg font-bold">
                                {(menu.menu_name || menu.nom).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {menu.menu_name || menu.nom}
                            </div>
                            <div className="text-sm text-gray-500">
                              cloudmenu.fr/m/{menu.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(menu, 'status')}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            menu.status === 'published'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                        >
                          {menu.status === 'published' ? 'Publié' : 'Brouillon'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(menu, 'actif')}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            menu.actif
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {menu.actif ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/categories/${menu.id}`}
                            className="px-3 py-1.5 bg-orange-600 text-white hover:bg-orange-700 rounded text-sm font-medium flex items-center gap-1.5 shadow-sm"
                            title="Gérer les articles"
                          >
                            <List size={16} />
                            <span>Articles</span>
                          </Link>
                          <Link
                            to={`/mon-menu/${menu.id}`}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                            title="Paramètres du menu"
                          >
                            <Settings size={18} />
                          </Link>
                          <button
                            onClick={() => duplicateMenu(menu)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                            title="Dupliquer"
                          >
                            <Copy size={18} />
                          </button>
                          <button
                            onClick={() => deleteMenu(menu.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
