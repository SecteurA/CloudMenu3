import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Palette,
  Eye,
  Upload,
  Save,
  Smartphone,
  ExternalLink,
  Info,
  Loader2,
  X,
  Check,
  ArrowLeft
} from 'lucide-react';
import { supabase, Menu, MenuInsert, MenuUpdate, generateSlug, uploadImage, deleteImage } from '../../lib/supabase';
import LoadingSpinner from '../Layout/LoadingSpinner';

const MonMenu = () => {
  const { menuId } = useParams<{ menuId: string }>();
  const navigate = useNavigate();
  const isNewMenu = menuId === undefined;
  const [hasRestaurantProfile, setHasRestaurantProfile] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [menuConfig, setMenuConfig] = useState({
    nom: '',
    menu_name: '',
    description: '',
    slug: '',
    banniere_url: '',
    language: 'fr',
    status: 'published',
    couleur_primaire: '#f97316',
    couleur_secondaire: '#1f2937',
    couleur_texte: '#374151',
    couleur_fond: '#ffffff',
    afficher_powered_by: true,
    lien_cloudmenu: true
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [existingMenu, setExistingMenu] = useState<Menu | null>(null);

  useEffect(() => {
    const checkRestaurantProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('restaurant_profiles')
          .select('restaurant_name, slug')
          .eq('user_id', user.id)
          .maybeSingle();

        setHasRestaurantProfile(!!data);

        if (data && isNewMenu) {
          setMenuConfig(prev => ({
            ...prev,
            nom: data.restaurant_name,
            slug: data.slug
          }));
        }
      }
      setCheckingProfile(false);
    };

    checkRestaurantProfile();
  }, [isNewMenu]);

  useEffect(() => {
    if (!isNewMenu && menuId) {
      loadExistingMenu(menuId);
    } else {
      setLoading(false);
    }
  }, [menuId, isNewMenu]);

  const loadExistingMenu = async (id: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors du chargement du menu:', error);
        showMessage('error', 'Erreur lors du chargement du menu');
        return;
      }

      if (!data) {
        showMessage('error', 'Menu non trouvé');
        navigate('/mes-menus');
        return;
      }

      setExistingMenu(data);
      setMenuConfig({
        nom: data.nom,
        menu_name: data.menu_name || '',
        description: data.description,
        slug: data.slug,
        banniere_url: data.banniere_url,
        language: data.language || 'fr',
        status: data.status || 'published',
        couleur_primaire: data.couleur_primaire,
        couleur_secondaire: data.couleur_secondaire,
        couleur_texte: data.couleur_texte,
        couleur_fond: data.couleur_fond,
        afficher_powered_by: data.afficher_powered_by,
        lien_cloudmenu: data.lien_cloudmenu
      });
    } catch (error) {
      console.error('Erreur lors du chargement du menu:', error);
      showMessage('error', 'Erreur lors du chargement du menu');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setMenuConfig(prev => {
      const newConfig = { ...prev, [field]: value };

      // Générer automatiquement le slug quand le nom change (seulement pour un nouveau menu sans restaurant profile)
      if (field === 'nom' && typeof value === 'string' && isNewMenu && !hasRestaurantProfile) {
        newConfig.slug = generateSlug(value);
      }


      return newConfig;
    });
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'banniere') => {
    if (!file) return;

    // Vérifier la taille du fichier
    const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB pour logo, 5MB pour bannière
    if (file.size > maxSize) {
      showMessage('error', `Le fichier est trop volumineux (max ${type === 'logo' ? '2MB' : '5MB'})`);
      return;
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Veuillez sélectionner une image valide');
      return;
    }

    setLoading(true);
    
    try {
      // Supprimer l'ancienne image si elle existe
      const oldUrl = menuConfig.banniere_url;
      if (oldUrl) {
        await deleteImage(oldUrl);
      }

      // Uploader la nouvelle image
      const folder = 'bannieres';
      const result = await uploadImage(file, folder);
      
      if (result.error) {
        showMessage('error', result.error);
        return;
      }

      // Mettre à jour l'état
      const field = 'banniere_url';
      handleInputChange(field, result.url);
      
      showMessage('success', 'Bannière uploadée avec succès');
    } catch (error) {
      showMessage('error', 'Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = async () => {
    if (!hasRestaurantProfile && !menuConfig.nom.trim()) {
      showMessage('error', 'Le nom de l\'établissement est obligatoire');
      return;
    }

    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showMessage('error', 'Vous devez être connecté');
        return;
      }

      if (existingMenu) {
        // Mise à jour du menu existant
        let finalSlug = menuConfig.slug;

        // Si on passe de draft à published et qu'il n'y a pas de slug, le générer
        if (menuConfig.status === 'published' && !existingMenu.slug) {
          const { data: profileData } = await supabase
            .from('restaurant_profiles')
            .select('slug')
            .eq('user_id', user.id)
            .maybeSingle();

          const restaurantSlug = profileData?.slug || generateSlug(menuConfig.nom);
          const menuSlugPart = generateSlug(menuConfig.menu_name || menuConfig.nom);
          finalSlug = `${restaurantSlug}/${menuSlugPart}`;
        }

        const updateData: MenuUpdate = {
          nom: menuConfig.nom,
          menu_name: menuConfig.menu_name,
          description: menuConfig.description,
          slug: finalSlug,
          banniere_url: menuConfig.banniere_url,
          language: menuConfig.language,
          status: menuConfig.status,
          couleur_primaire: menuConfig.couleur_primaire,
          couleur_secondaire: menuConfig.couleur_secondaire,
          couleur_texte: menuConfig.couleur_texte,
          couleur_fond: menuConfig.couleur_fond,
          afficher_powered_by: menuConfig.afficher_powered_by,
          lien_cloudmenu: menuConfig.lien_cloudmenu
        };

        const { error } = await supabase
          .from('menus')
          .update(updateData)
          .eq('id', existingMenu.id);

        if (error) throw error;

        showMessage('success', 'Menu mis à jour avec succès');
      } else {
        // Création d'un nouveau menu
        let finalSlug = menuConfig.slug;

        // Ne générer le slug que si le statut est "published"
        if (menuConfig.status === 'published') {
          // menuConfig.slug contient le slug du restaurant (ex: "la-napoli")
          const restaurantSlug = menuConfig.slug;
          const menuSlugPart = generateSlug(menuConfig.menu_name || 'menu');
          finalSlug = `${restaurantSlug}/${menuSlugPart}`;
        } else if (menuConfig.status === 'draft') {
          finalSlug = '';
        }

        const insertData: MenuInsert = {
          user_id: user.id,
          nom: menuConfig.nom,
          menu_name: menuConfig.menu_name || 'Menu principal',
          description: menuConfig.description,
          slug: finalSlug,
          banniere_url: menuConfig.banniere_url,
          language: menuConfig.language,
          status: menuConfig.status,
          couleur_primaire: menuConfig.couleur_primaire,
          couleur_secondaire: menuConfig.couleur_secondaire,
          couleur_texte: menuConfig.couleur_texte,
          couleur_fond: menuConfig.couleur_fond,
          afficher_powered_by: menuConfig.afficher_powered_by,
          lien_cloudmenu: menuConfig.lien_cloudmenu
        };

        const { data, error } = await supabase
          .from('menus')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;
        
        setExistingMenu(data);
        showMessage('success', 'Menu créé avec succès');
        setTimeout(() => {
          navigate('/mes-menus');
        }, 1500);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const colorPresets = [
    { name: 'Orange', primary: '#f97316', secondary: '#1f2937' },
    { name: 'Bleu', primary: '#3b82f6', secondary: '#1e293b' },
    { name: 'Vert', primary: '#10b981', secondary: '#064e3b' },
    { name: 'Rouge', primary: '#ef4444', secondary: '#7f1d1d' },
    { name: 'Violet', primary: '#8b5cf6', secondary: '#581c87' },
    { name: 'Rose', primary: '#ec4899', secondary: '#831843' }
  ];

  if ((loading && !existingMenu) || checkingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Message de notification */}
        {message && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg flex items-start sm:items-center space-x-2 text-sm sm:text-base ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/mes-menus')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Retour à mes menus</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isNewMenu ? 'Créer un nouveau menu' : 'Modifier le menu'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            {isNewMenu
              ? 'Configurez l\'identité visuelle de votre nouveau menu'
              : 'Personnalisez votre menu et voyez le résultat en temps réel'}
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Informations générales */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Info size={20} />
              <span>Informations générales</span>
            </h2>
            <div className="space-y-6">
              {(!hasRestaurantProfile || !isNewMenu) && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Nom de l'établissement
                  </label>
                  <input
                    type="text"
                    value={menuConfig.nom}
                    onChange={(e) => handleInputChange('nom', e.target.value)}
                    placeholder="ex: Chez Antoine"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
                    disabled={!isNewMenu}
                  />
                  {!isNewMenu && (
                    <p className="mt-1 text-xs text-gray-500">
                      Le nom de l'établissement est partagé entre tous vos menus
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Nom du menu
                </label>
                <input
                  type="text"
                  value={menuConfig.menu_name}
                  onChange={(e) => handleInputChange('menu_name', e.target.value)}
                  placeholder="ex: Carte des boissons, Menu du jour, Carte des plats..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {hasRestaurantProfile && isNewMenu
                    ? 'Donnez un nom à ce menu pour le distinguer de vos autres menus'
                    : 'Ce nom permettra aux clients de distinguer vos différents menus (boissons, plats, desserts...)'}
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={menuConfig.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Décrivez votre établissement en quelques mots..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Bannière
                </label>
                <div className="space-y-3">
                  {menuConfig.banniere_url && (
                    <div className="relative">
                      <img 
                        src={menuConfig.banniere_url} 
                        alt="Bannière" 
                        className="w-full h-16 sm:h-20 object-cover rounded border border-gray-200"
                      />
                      <button
                        onClick={() => handleInputChange('banniere_url', '')}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 text-xs"
                      >
                        <X size={10} className="sm:w-3 sm:h-3" />
                      </button>
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'banniere');
                      }}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center hover:border-orange-400 transition-colors">
                      <Upload className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                      <p className="mt-1 text-xs sm:text-sm text-gray-600">
                        Cliquer pour uploader
                      </p>
                      <p className="text-xs text-gray-500 hidden sm:block">PNG, JPG jusqu'à 5MB</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Design */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Palette size={20} />
              <span>Design</span>
            </h2>
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Palette de couleurs</h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                  {colorPresets.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleInputChange('couleur_primaire', preset.primary);
                        handleInputChange('couleur_secondaire', preset.secondary);
                      }}
                      className="flex items-center space-x-1 sm:space-x-2 p-2 sm:p-3 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors"
                    >
                      <div className="flex space-x-1">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: preset.secondary }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-medium">{preset.name}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Couleur primaire
                    </label>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <input
                        type="color"
                        value={menuConfig.couleur_primaire}
                        onChange={(e) => handleInputChange('couleur_primaire', e.target.value)}
                        className="w-10 h-8 sm:w-12 sm:h-10 border border-gray-300 rounded cursor-pointer flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={menuConfig.couleur_primaire}
                        onChange={(e) => handleInputChange('couleur_primaire', e.target.value)}
                        className="flex-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Couleur secondaire
                    </label>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <input
                        type="color"
                        value={menuConfig.couleur_secondaire}
                        onChange={(e) => handleInputChange('couleur_secondaire', e.target.value)}
                        className="w-10 h-8 sm:w-12 sm:h-10 border border-gray-300 rounded cursor-pointer flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={menuConfig.couleur_secondaire}
                        onChange={(e) => handleInputChange('couleur_secondaire', e.target.value)}
                        className="flex-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-orange-600 text-white py-2 sm:py-3 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium text-sm sm:text-base"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
            )}
            <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonMenu;