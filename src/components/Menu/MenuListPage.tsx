import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, CreditCard as Edit, QrCode, Trash2, Copy, Globe, FileText, Settings, List, GripVertical } from 'lucide-react';
import { supabase, Menu, generateSlug } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Layout/LoadingSpinner';

const LANGUAGES = {
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  ar: { name: 'العربية', flag: '🇸🇦' }
};

export default function MenuListPage() {
  const { user } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
        .order('ordre', { ascending: true })
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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newMenus = [...menus];
    const draggedMenu = newMenus[draggedIndex];

    newMenus.splice(draggedIndex, 1);
    newMenus.splice(dropIndex, 0, draggedMenu);

    setMenus(newMenus);
    setDraggedIndex(null);

    try {
      const updates = newMenus.map((menu, index) => ({
        id: menu.id,
        ordre: index
      }));

      for (const update of updates) {
        await supabase
          .from('menus')
          .update({ ordre: update.ordre })
          .eq('id', update.id);
      }

      showMessage('success', 'Ordre des menus mis à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'ordre:', error);
      showMessage('error', 'Erreur lors de la mise à jour de l\'ordre');
      loadMenus();
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
              {menus.map((menu, index) => (
                <div
                  key={menu.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-move ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
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
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-2 flex-1">
                        <GripVertical className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {menu.menu_name || menu.nom}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{LANGUAGES[menu.language || 'fr']?.flag}</span>
                            <span className="text-xs text-gray-500">
                              {LANGUAGES[menu.language || 'fr']?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => toggleStatus(menu, 'status')}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            menu.status === 'published'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                        >
                          {menu.status === 'published' ? 'Publié' : 'Brouillon'}
                        </button>
                        <button
                          onClick={() => toggleStatus(menu, 'actif')}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            menu.actif
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {menu.actif ? 'Actif' : 'Inactif'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Link
                        to={`/categories/${menu.id}`}
                        className="w-full flex items-center justify-center gap-2 text-sm bg-orange-600 text-white hover:bg-orange-700 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
                      >
                        <List size={18} />
                        <span>Gérer les articles</span>
                      </Link>
                      <div className="grid grid-cols-3 gap-2">
                        <Link
                          to={`/mon-menu/${menu.id}`}
                          className="flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2.5 rounded-lg border border-gray-200 transition-colors"
                          title="Paramètres"
                        >
                          <Settings size={20} />
                        </Link>
                        <button
                          onClick={() => duplicateMenu(menu)}
                          className="flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2.5 rounded-lg border border-gray-200 transition-colors"
                          title="Dupliquer"
                        >
                          <Copy size={20} />
                        </button>
                        <button
                          onClick={() => deleteMenu(menu.id)}
                          className="flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 p-2.5 rounded-lg border border-red-200 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
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
                    <th className="w-8 px-2 py-3"></th>
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
                  {menus.map((menu, index) => (
                    <tr
                      key={menu.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`hover:bg-gray-50 transition-colors cursor-move ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-2 py-4">
                        <GripVertical className="text-gray-400" size={20} />
                      </td>
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
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                            title="Gérer les articles"
                          >
                            <List size={18} />
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
