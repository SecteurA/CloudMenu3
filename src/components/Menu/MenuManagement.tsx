import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit, Trash2, Save, X, GripVertical, Upload, Utensils, Eye, EyeOff, Leaf, Flame, Camera, Loader2, Check, ArrowUpDown, Wand2 } from 'lucide-react';
import { supabase, Menu, Category, MenuItem, CategoryInsert, MenuItemInsert, MenuItemUpdate, uploadImage, deleteImage } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function MenuManagement() {
  const { user } = useAuth();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // États pour l'édition d'éléments
  const [editingItemData, setEditingItemData] = useState<Partial<MenuItemUpdate>>({});

  // États pour les nouveaux éléments
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItems, setNewItems] = useState<Record<string, Partial<MenuItemInsert>>>({});

  useEffect(() => {
    if (user) {
      loadUserMenu();
    }
  }, [user]);

  useEffect(() => {
    if (menu) {
      loadMenuData();
    }
  }, [menu]);

  const loadUserMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors du chargement du menu:', error);
        return;
      }

      setMenu(data);
    } catch (error) {
      console.error('Erreur lors du chargement du menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMenuData = async () => {
    setLoading(true);
    try {
      // Charger les catégories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('menu_id', menu.id)
        .order('ordre', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Charger les éléments pour chaque catégorie
      if (categoriesData && categoriesData.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .in('category_id', categoriesData.map(c => c.id))
          .order('ordre', { ascending: true });

        if (itemsError) throw itemsError;

        // Grouper les éléments par catégorie
        const itemsByCategory: Record<string, MenuItem[]> = {};
        categoriesData.forEach(category => {
          itemsByCategory[category.id] = itemsData?.filter(item => item.category_id === category.id) || [];
        });
        setMenuItems(itemsByCategory);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      showMessage('error', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const categoryData: CategoryInsert = {
        menu_id: menu.id,
        nom: newCategoryName,
        ordre: categories.length
      };

      const { data, error } = await supabase
        .from('categories')
        .insert([categoryData])
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setMenuItems({ ...menuItems, [data.id]: [] });
      setNewCategoryName('');
      showMessage('success', 'Catégorie ajoutée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la catégorie:', error);
      showMessage('error', 'Erreur lors de l\'ajout de la catégorie');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie et tous ses éléments ?')) return;

    try {
     // Delete all images associated with menu items in this category
     const categoryItems = menuItems[categoryId] || [];
     for (const item of categoryItems) {
       if (item.image_url) {
         try {
           await deleteImage(item.image_url);
         } catch (imageError) {
           console.warn(`Failed to delete image for item ${item.nom}:`, imageError);
           // Continue with deletion even if image deletion fails
         }
       }
     }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(categories.filter(c => c.id !== categoryId));
      const newMenuItems = { ...menuItems };
      delete newMenuItems[categoryId];
      setMenuItems(newMenuItems);
      showMessage('success', 'Catégorie supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showMessage('error', 'Erreur lors de la suppression');
    }
  };


  const handleImageUpload = async (file: File, itemId: string, categoryId: string) => {
    if (!file) return;

    // Vérifier la taille du fichier (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Le fichier est trop volumineux (max 5MB)');
      return;
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Veuillez sélectionner une image valide');
      return;
    }

    const uploadKey = itemId || `new-item-${categoryId}`;
    setUploadingImage(uploadKey);
    
    try {
      // Uploader l'image
      const result = await uploadImage(file, 'menu-items');
      
      if (result.error) {
        showMessage('error', result.error);
        return;
      }

      // Mise à jour d'un élément existant
        const { data, error } = await supabase
          .from('menu_items')
          .update({ image_url: result.url })
          .eq('id', itemId)
          .select()
          .single();

        if (error) throw error;

        setMenuItems({
          ...menuItems,
          [categoryId]: menuItems[categoryId].map(item => item.id === itemId ? data : item)
        });
        showMessage('success', 'Image mise à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      showMessage('error', 'Erreur lors de l\'upload');
    } finally {
      setUploadingImage(null);
    }
  };

  const removeItemImage = async (itemId: string, categoryId: string, imageUrl: string) => {
    try {
      // Supprimer l'image du storage
      if (imageUrl) {
        await deleteImage(imageUrl);
      }

      // Mettre à jour l'élément
      const { data, error } = await supabase
        .from('menu_items')
        .update({ image_url: '' })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      setMenuItems({
        ...menuItems,
        [categoryId]: menuItems[categoryId].map(item => item.id === itemId ? data : item)
      });
      showMessage('success', 'Image supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showMessage('error', 'Erreur lors de la suppression');
    }
  };

  const handleNewItemImageUpload = async (file: File, categoryId: string) => {
    if (!file) return;

    // Vérifier la taille du fichier (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Le fichier est trop volumineux (max 5MB)');
      return;
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Veuillez sélectionner une image valide');
      return;
    }

    setUploadingImage(`new-item-${categoryId}`);
    
    try {
      // Uploader l'image
      const result = await uploadImage(file, 'menu-items');
      
      if (result.error) {
        showMessage('error', result.error);
        return;
      }

      // Mettre à jour le nouvel élément
      setNewItems({
        ...newItems,
        [categoryId]: {
          ...newItems[categoryId],
          image_url: result.url
        }
      });
      
      showMessage('success', 'Image uploadée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      showMessage('error', 'Erreur lors de l\'upload');
    } finally {
      setUploadingImage(null);
    }
  };

  const getNewItemForCategory = (categoryId: string): Partial<MenuItemInsert> => {
    return newItems[categoryId] || {
      nom: '',
      description: '',
      prix: 0,
      image_url: '',
      allergenes: [],
      vegetarien: false,
      vegan: false,
      sans_gluten: false,
      epice: false,
      disponible: true
    };
  };

  const updateNewItemForCategory = (categoryId: string, updates: Partial<MenuItemInsert>) => {
    setNewItems({
      ...newItems,
      [categoryId]: {
        ...getNewItemForCategory(categoryId),
        ...updates
      }
    });
  };

  const addMenuItem = async (categoryId: string) => {
    const newItem = getNewItemForCategory(categoryId);
    
    if (!newItem.nom?.trim() || !newItem.prix) {
      showMessage('error', 'Le nom et le prix sont obligatoires');
      return;
    }

    try {
      const itemData: MenuItemInsert = {
        ...newItem as MenuItemInsert,
        category_id: categoryId,
        ordre: menuItems[categoryId]?.length || 0
      };

      const { data, error } = await supabase
        .from('menu_items')
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;

      setMenuItems({
        ...menuItems,
        [categoryId]: [...(menuItems[categoryId] || []), data]
      });
      
      // Reset the form for this category
      const newItemsUpdated = { ...newItems };
      delete newItemsUpdated[categoryId];
      setNewItems(newItemsUpdated);
      
      showMessage('success', 'Plat ajouté avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du plat:', error);
      showMessage('error', 'Erreur lors de l\'ajout du plat');
      }
  };

  const deleteMenuItem = async (itemId: string, categoryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) return;

    try {
      // Get the item details first to check for image
      const itemToDelete = menuItems[categoryId].find(item => item.id === itemId);
      
      // Delete associated image from storage if it exists
      if (itemToDelete?.image_url) {
        await deleteImage(itemToDelete.image_url);
      }

      // Delete the item from database
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setMenuItems({
        ...menuItems,
        [categoryId]: menuItems[categoryId].filter(item => item.id !== itemId)
      });
      showMessage('success', 'Plat supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showMessage('error', 'Erreur lors de la suppression');
    }
  };

  const toggleItemAvailability = async (item: MenuItem, categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ disponible: !item.disponible })
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;

      setMenuItems({
        ...menuItems,
        [categoryId]: menuItems[categoryId].map(i => i.id === item.id ? data : i)
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      showMessage('error', 'Erreur lors de la mise à jour');
    }
  };

  const startEditItem = (item: MenuItem) => {
    setEditingItem(item.id);
    setEditingItemData({
      nom: item.nom,
      description: item.description,
      prix: item.prix,
      allergenes: item.allergenes,
      vegetarien: item.vegetarien,
      vegan: item.vegan,
      sans_gluten: item.sans_gluten,
      epice: item.epice
    });
  };

  const cancelEditItem = () => {
    setEditingItem(null);
    setEditingItemData({});
  };

  const saveEditItem = async (itemId: string, categoryId: string) => {
    if (!editingItemData.nom?.trim()) {
      showMessage('error', 'Le nom du plat est obligatoire');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update(editingItemData)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      setMenuItems({
        ...menuItems,
        [categoryId]: menuItems[categoryId].map(item => item.id === itemId ? data : item)
      });
      
      setEditingItem(null);
      setEditingItemData({});
      showMessage('success', 'Plat modifié avec succès');
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      showMessage('error', 'Erreur lors de la modification');
    }
  };

  const moveItemToCategory = async (itemId: string, currentCategoryId: string, newCategoryId: string) => {
    if (currentCategoryId === newCategoryId) return;

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ category_id: newCategoryId })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      // Remove from current category
      const updatedCurrentItems = menuItems[currentCategoryId].filter(item => item.id !== itemId);
      
      // Add to new category
      const updatedNewItems = [...(menuItems[newCategoryId] || []), data];

      setMenuItems({
        ...menuItems,
        [currentCategoryId]: updatedCurrentItems,
        [newCategoryId]: updatedNewItems
      });

      showMessage('success', 'Plat déplacé avec succès');
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      showMessage('error', 'Erreur lors du déplacement');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Configurez d'abord votre menu</h2>
        <p className="text-gray-600 mb-6">
          Vous devez d'abord configurer les informations de base de votre menu.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
        >
          Aller à la configuration
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl">
      {/* Message */}
      {message && (
        <div className={`p-3 sm:p-4 rounded-lg flex items-start sm:items-center space-x-2 text-sm sm:text-base ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gestion du menu</h2>
          <p className="text-sm sm:text-base text-gray-600">Organisez vos catégories et plats</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/import-ai"
            className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 text-sm sm:text-base w-fit"
          >
            <Wand2 size={18} />
            <span>Import IA</span>
          </Link>
          <a 
            href={`/m/${menu.slug}`} 
            target="_blank"
            className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2 text-sm sm:text-base w-fit"
          >
            <Eye size={18} />
            <span>Prévisualiser</span>
          </a>
        </div>
      </div>

      {/* Ajouter une catégorie */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Ajouter une catégorie</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nom de la catégorie (ex: Entrées, Plats, Desserts...)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <button
            onClick={addCategory}
            className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <Plus size={18} />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Liste des catégories */}
      {categories.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Utensils className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
          <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-medium text-gray-900">Aucune catégorie</h3>
          <p className="mt-2 text-sm sm:text-base text-gray-600 px-4">
            Commencez par ajouter une catégorie pour organiser votre menu.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Header de catégorie */}
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="text-gray-400 hidden sm:block" size={20} />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{category.nom}</h3>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs sm:text-sm">
                      {menuItems[category.id]?.length || 0} plats
                    </span>
                  </div>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Liste des plats */}
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  {menuItems[category.id]?.map((item) => (
                    <div key={item.id} className={`flex items-start sm:items-center flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg transition-colors ${
                      editingItem === item.id 
                        ? 'border-orange-300 bg-orange-50' 
                        : 'border-gray-200 hover:border-orange-200'
                    }`}>
                      {/* Image */}
                      <div className="w-20 h-20 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden relative group flex-shrink-0 self-center sm:self-start">
                        {item.image_url ? (
                          <>
                            <img src={item.image_url} alt={item.nom} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(file, item.id, category.id);
                                  }}
                                  className="hidden"
                                />
                                {uploadingImage === item.id ? (
                                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                                ) : (
                                  <Camera className="w-4 h-4 text-white hover:scale-110" />
                                )}
                              </label>
                              <button
                                onClick={() => removeItemImage(item.id, category.id, item.image_url)}
                                className="text-white hover:text-red-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <label className="cursor-pointer w-full h-full flex items-center justify-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, item.id, category.id);
                              }}
                              className="hidden"
                            />
                            {uploadingImage === item.id ? (
                              <Loader2 className="text-gray-400 animate-spin" size={24} />
                            ) : (
                              <div className="flex flex-col items-center">
                                <Camera className="text-gray-400" size={20} />
                                <span className="text-xs text-gray-400 mt-1">Photo</span>
                              </div>
                            )}
                          </label>
                        )}
                      </div>

                      {/* Informations ou Formulaire d'édition */}
                      <div className="flex-1">
                        {editingItem === item.id ? (
                          /* Formulaire d'édition */
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
                                <input
                                  type="text"
                                  value={editingItemData.nom || ''}
                                  onChange={(e) => setEditingItemData({ ...editingItemData, nom: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-orange-500 focus:border-orange-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Prix (€)</label>
                                <input
                                  type="number"
                                  value={editingItemData.prix || ''}
                                  onChange={(e) => setEditingItemData({ ...editingItemData, prix: parseFloat(e.target.value) || 0 })}
                                  step="0.01"
                                  min="0"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-orange-500 focus:border-orange-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                              <textarea
                                value={editingItemData.description || ''}
                                onChange={(e) => setEditingItemData({ ...editingItemData, description: e.target.value })}
                                rows={2}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={editingItemData.vegetarien || false}
                                  onChange={(e) => setEditingItemData({ ...editingItemData, vegetarien: e.target.checked })}
                                  className="rounded text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-xs">Végétarien</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={editingItemData.vegan || false}
                                  onChange={(e) => setEditingItemData({ ...editingItemData, vegan: e.target.checked })}
                                  className="rounded text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-xs">Vegan</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={editingItemData.sans_gluten || false}
                                  onChange={(e) => setEditingItemData({ ...editingItemData, sans_gluten: e.target.checked })}
                                  className="rounded text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-xs">Sans gluten</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={editingItemData.epice || false}
                                  onChange={(e) => setEditingItemData({ ...editingItemData, epice: e.target.checked })}
                                  className="rounded text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-xs">Épicé</span>
                              </label>
                            </div>
                          </div>
                        ) : (
                          /* Affichage normal */
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">{item.nom}</h4>
                          {item.vegetarien && <Leaf className="text-green-600" size={16} />}
                          {item.vegan && <Leaf className="text-green-700" size={16} />}
                          {item.epice && <Flame className="text-red-600" size={16} />}
                        </div>
                        {item.description && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">{item.description}</p>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <span className="font-semibold text-orange-600 text-sm sm:text-base">{item.prix.toFixed(2)} €</span>
                          {item.allergenes.length > 0 && (
                            <span className="text-xs text-gray-500 break-words">
                              Allergènes: {item.allergenes.join(', ')}
                            </span>
                          )}
                        </div>
                          </div>
                        )}
                      </div>

                      {/* Actions et déplacement */}
                      <div className="flex items-center space-x-2 self-end sm:self-start">
                        {/* Déplacer vers une autre catégorie */}
                        {categories.length > 1 && editingItem !== item.id && (
                          <select
                            value={category.id}
                            onChange={(e) => moveItemToCategory(item.id, category.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-orange-500 focus:border-orange-500"
                            title="Déplacer vers une autre catégorie"
                          >
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.nom}
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {editingItem === item.id ? (
                          /* Boutons Sauvegarder/Annuler */
                          <>
                            <button
                              onClick={() => saveEditItem(item.id, category.id)}
                              className="text-green-600 hover:text-green-700 p-2 rounded-lg hover:bg-green-50"
                              title="Sauvegarder"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={cancelEditItem}
                              className="text-gray-600 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-50"
                              title="Annuler"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          /* Boutons normaux */
                          <>
                            <button
                              onClick={() => startEditItem(item)}
                              className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50"
                              title="Modifier"
                            >
                              <Edit size={18} />
                            </button>
                        <button
                          onClick={() => toggleItemAvailability(item, category.id)}
                          className={`p-2 rounded-lg ${
                            item.disponible 
                              ? 'text-green-600 hover:bg-green-50' 
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={item.disponible ? 'Disponible' : 'Non disponible'}
                        >
                          {item.disponible ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button
                          onClick={() => toggleItemAvailability(item, category.id)}
                          className={`p-2 rounded-lg ${
                            item.disponible 
                              ? 'text-green-600 hover:bg-green-50' 
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={item.disponible ? 'Disponible' : 'Non disponible'}
                        >
                          {item.disponible ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item.id, category.id)}
                          className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                              title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Ajouter un plat */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {(() => {
                        const newItem = getNewItemForCategory(category.id);
                        return (
                          <>
                            {/* Image pour nouveau plat */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Image</label>
                        <div className="w-full h-16 sm:h-20 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                          {newItem.image_url ? (
                            <div className="relative w-full h-full">
                              <img src={newItem.image_url} alt="Aperçu" className="w-full h-full object-cover" />
                              <button
                                    onClick={() => updateNewItemForCategory(category.id, { image_url: '' })}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer w-full h-full flex items-center justify-center">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                      if (file) handleNewItemImageUpload(file, category.id);
                                }}
                                className="hidden"
                              />
                                  {uploadingImage === `new-item-${category.id}` ? (
                                <Loader2 className="text-gray-400 animate-spin" size={20} />
                              ) : (
                                <div className="flex flex-col items-center">
                                  <Upload className="text-gray-400" size={16} />
                                  <span className="text-xs text-gray-400 mt-1">Photo</span>
                                </div>
                              )}
                            </label>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Nom</label>
                        <input
                          type="text"
                          value={newItem.nom || ''}
                              onChange={(e) => updateNewItemForCategory(category.id, { nom: e.target.value })}
                          placeholder="Nom du plat"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm h-10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Description</label>
                        <input
                          type="text"
                          value={newItem.description || ''}
                              onChange={(e) => updateNewItemForCategory(category.id, { description: e.target.value })}
                          placeholder="Description"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm h-10"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Prix (€)</label>
                        <input
                          type="number"
                          value={newItem.prix || ''}
                              onChange={(e) => updateNewItemForCategory(category.id, { prix: parseFloat(e.target.value) || 0 })}
                          placeholder="Prix"
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm h-10 sm:h-10"
                        />
                        </div>
                        <button
                          onClick={() => addMenuItem(category.id)}
                          className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-orange-700 flex items-center justify-center space-x-1 text-sm h-10 sm:mt-6"
                        >
                          <Plus size={16} />
                          <span className="hidden sm:inline">Ajouter</span>
                        </button>
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};