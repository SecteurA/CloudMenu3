import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Wand2, FileImage, Loader2, Check, X, ArrowLeft } from 'lucide-react';
import { supabase, Menu, uploadImage, deleteImage } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../Layout/LoadingSpinner';

const AIMenuImport = () => {
  const { user } = useAuth();
  const { menuId } = useParams<{ menuId: string }>();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiParsing, setAiParsing] = useState(false);
  const [selectedMenuImage, setSelectedMenuImage] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [parseStep, setParseStep] = useState<string>('');
  const [importImages, setImportImages] = useState<boolean>(true);

  useEffect(() => {
    if (user && menuId) {
      loadUserMenu();
    }
  }, [user, menuId]);

  const loadUserMenu = async () => {
    if (!menuId) {
      showMessage('error', 'ID de menu manquant');
      navigate('/mes-menus');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('id', menuId)
        .eq('user_id', user!.id)
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

      setMenu(data);
    } catch (error) {
      console.error('Erreur lors du chargement du menu:', error);
      showMessage('error', 'Erreur lors du chargement du menu');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleMenuImageUpload = async (file: File) => {
    if (!file) return;

    // Vérifier la taille du fichier (10MB max pour les menus)
    if (file.size > 10 * 1024 * 1024) {
      showMessage('error', 'Le fichier est trop volumineux (max 10MB)');
      return;
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Veuillez sélectionner une image valide');
      return;
    }

    setAiParsing(true);
    
    try {
      // Upload de l'image vers Supabase Storage
      showMessage('success', 'Upload de l\'image en cours...');
      const uploadResult = await uploadImage(file, 'menu-items');
      
      if (uploadResult.error) {
        showMessage('error', uploadResult.error);
        return;
      }

      // Appeler l'Edge Function pour analyser l'image
      setParseStep('Analyse de l\'image avec l\'IA...');
      showMessage('success', 'Analyse de l\'image avec l\'IA...');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-menu-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          imageUrl: uploadResult.url,
          menuId: menu!.id,
          importImages: importImages
        })
      });

      setParseStep('Traitement de la réponse...');
      if (!response.ok) {
        const errorData = await response.json();
        showMessage('error', errorData.error || 'Erreur lors de l\'analyse');
        return;
      }

      const result = await response.json();
      
      if (!result.success) {
        showMessage('error', result.error || 'Erreur lors de l\'analyse');
        return;
      }

      setParseStep('Insertion des données en base...');
      // Insérer les données dans la base
      showMessage('success', 'Insertion des données et images en base...');
      await insertParsedMenuData(result.data);
      
      // Clean up: delete the uploaded image used for analysis
      try {
        await deleteImage(uploadResult.url);
      } catch (cleanupError) {
        // Log but don't fail the import if cleanup fails
        console.warn('Failed to cleanup analysis image:', cleanupError);
      }
      
      showMessage('success', 'Menu importé avec succès ! 🎉 Vous pouvez maintenant retourner à la gestion du menu.');
      
      // Redirection automatique vers la gestion du menu après 2 secondes
      setTimeout(() => {
        navigate('/categories');
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors du traitement:', error);
      showMessage('error', 'Erreur lors du traitement de l\'image');
    } finally {
      setAiParsing(false);
      setParseStep('');
      setSelectedMenuImage(null);
    }
  };

  const insertParsedMenuData = async (menuData: any) => {
    try {
      // Get existing categories to set correct order
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('ordre')
        .eq('menu_id', menu!.id)
        .order('ordre', { ascending: false })
        .limit(1);

      const startOrder = existingCategories && existingCategories.length > 0 
        ? existingCategories[0].ordre + 1 
        : 0;

      for (const categoryData of menuData.categories) {
        // Créer la catégorie
        const { data: category, error: categoryError } = await supabase
          .from('categories')
          .insert([{
            menu_id: menu!.id,
            nom: categoryData.name,
            description: categoryData.description || '',
            ordre: startOrder + menuData.categories.indexOf(categoryData)
          }])
          .select()
          .single();

        if (categoryError) throw categoryError;

        // Créer les éléments de menu
        for (const itemData of categoryData.items) {
          const { error: itemError } = await supabase
            .from('menu_items')
            .insert([{
              category_id: category.id,
              nom: itemData.name,
              description: itemData.description || '',
              prix: itemData.price || 0,
              image_url: itemData.image_url || '',
              allergenes: itemData.allergenes || [],
              vegetarien: itemData.vegetarian || false,
              vegan: itemData.vegan || false,
              sans_gluten: itemData.gluten_free || false,
              epice: itemData.spicy || false,
              ordre: categoryData.items.indexOf(itemData)
            }]);

          if (itemError) throw itemError;
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'insertion:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Configurez d'abord votre menu</h2>
          <p className="text-gray-600 mb-6">
            Vous devez d'abord configurer les informations de base de votre menu.
          </p>
          <Link 
            to="/mon-menu"
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
          >
            Aller à la configuration
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            to={`/categories/${menuId}`}
            className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import automatique avec l'IA</h1>
            <p className="text-gray-600">Uploadez une photo de votre menu pour un import automatique</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 mt-0.5" />
          ) : (
            <X className="w-5 h-5 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* AI Import Card */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wand2 className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Importez votre menu automatiquement</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Notre IA analyse votre menu et extrait automatiquement tous les plats, prix et informations.
            Prenez simplement une photo claire de votre menu et laissez la magie opérer !
          </p>
        </div>

        {/* Upload Area */}
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedMenuImage(file);
                }}
                className="hidden"
                disabled={aiParsing}
              />
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                selectedMenuImage 
                  ? 'border-purple-400 bg-purple-50' 
                  : 'border-purple-300 hover:border-purple-400 bg-white hover:bg-purple-50'
              }`}>
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <FileImage className="w-6 h-6 text-purple-600" />
                  </div>
                  {selectedMenuImage ? (
                    <div>
                      <p className="text-lg font-medium text-gray-900">{selectedMenuImage.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedMenuImage.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Cliquez pour sélectionner une image de votre menu
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG jusqu'à 10MB - Plus la photo est claire, meilleur sera le résultat
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </label>
          </div>

          {/* Import Images Checkbox */}
          <div className="mb-6 flex items-center justify-center space-x-3 bg-white rounded-lg p-4">
            <input
              type="checkbox"
              id="importImages"
              checked={importImages}
              onChange={(e) => setImportImages(e.target.checked)}
              disabled={aiParsing}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <label
              htmlFor="importImages"
              className="text-gray-700 font-medium cursor-pointer select-none"
            >
              Importer automatiquement des images pour chaque plat
            </label>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={() => selectedMenuImage && handleMenuImageUpload(selectedMenuImage)}
              disabled={!selectedMenuImage || aiParsing}
              className="bg-purple-600 text-white px-8 py-4 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-3 mx-auto text-lg font-medium min-w-[200px]"
            >
              {aiParsing ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Analyse en cours...</span>
                </>
              ) : (
                <>
                  <Wand2 size={24} />
                  <span>Analyser le menu</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        {aiParsing && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-purple-100 rounded-xl p-6">
              <div className="flex items-center justify-center space-x-3 text-purple-700 mb-4">
                <Loader2 className="animate-spin" size={20} />
                <span className="font-medium">{parseStep || 'L\'IA analyse votre menu...'}</span>
              </div>
              <div className="bg-purple-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
              </div>
              <p className="text-sm text-purple-600 mt-3 text-center">
                Cela peut prendre quelques minutes selon la complexité de votre menu et le nombre de plats
                {importImages && (
                  <>
                    <br />
                    <strong>Recherche automatique d'images pour chaque plat incluse !</strong>
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Conseils pour un meilleur résultat</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 font-bold">📱</span>
              </div>
              <p className="text-sm text-gray-600">Photo bien éclairée et nette</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">📄</span>
              </div>
              <p className="text-sm text-gray-600">Menu entier visible</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-purple-600 font-bold text-lg">✓</span>
              </div>
              <p className="text-sm text-gray-600">Texte lisible sans reflets</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIMenuImport;