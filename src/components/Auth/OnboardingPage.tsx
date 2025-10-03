import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Upload, Loader2, Check, X, AlertCircle, Camera, Phone, MessageCircle, Instagram, Facebook } from 'lucide-react';
import { supabase, RestaurantProfileInsert, generateSlug, uploadImage, deleteImage } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const OnboardingPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // États pour le formulaire
  const [formData, setFormData] = useState({
    restaurant_name: '',
    description: '',
    slug: '',
    banner_url: '',
    logo_url: '',
    telephone: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    address: '',
    hours: ''
  });

  // États pour la validation du slug
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const totalSteps = 3;

  // Vérifier si l'utilisateur a déjà un profil restaurant
  useEffect(() => {
    if (user) {
      checkExistingProfile();
    }
  }, [user]);

  // Générer le slug automatiquement
  useEffect(() => {
    const generateSlugFromName = () => {
      if (formData.restaurant_name.trim()) {
        const newSlug = generateSlug(formData.restaurant_name);
        setFormData(prev => ({ ...prev, slug: newSlug }));
        setSlugAvailable(true); // Always available for restaurant profiles
      } else {
        setFormData(prev => ({ ...prev, slug: '' }));
        setSlugAvailable(null);
      }
    };

    const debounceTimeout = setTimeout(generateSlugFromName, 500);
    return () => clearTimeout(debounceTimeout);
  }, [formData.restaurant_name]);

  const checkExistingProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification du profil:', error);
        return;
      }

      if (data) {
        // L'utilisateur a déjà un profil, rediriger vers le dashboard
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du profil:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'banner') => {
    if (!file || !user) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showMessage('error', 'Le fichier est trop volumineux (max 5MB)');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Veuillez sélectionner une image valide');
      return;
    }

    setUploadingBanner(true);

    try {
      const folder = type === 'banner' ? 'banners' : 'logos';
      const imageUrl = await uploadImage(file, user.id, folder);

      const field = type === 'banner' ? 'banner_url' : 'logo_url';
      handleInputChange(field, imageUrl);

      showMessage('success', `${type === 'banner' ? 'Bannière' : 'Logo'} uploadé avec succès`);
    } catch (error) {
      showMessage('error', 'Erreur lors de l\'upload');
    } finally {
      setUploadingBanner(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.restaurant_name.trim() && formData.slug && slugAvailable === true;
      case 2:
        return true; // Images optionnelles
      case 3:
        return true; // Contacts optionnels
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNextStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const insertData: RestaurantProfileInsert = {
        user_id: user.id,
        restaurant_name: formData.restaurant_name,
        slug: formData.slug,
        description: formData.description,
        banner_url: formData.banner_url,
        logo_url: formData.logo_url,
        telephone: formData.telephone,
        whatsapp: formData.whatsapp,
        instagram: formData.instagram,
        facebook: formData.facebook,
        tiktok: formData.tiktok,
        address: formData.address,
        hours: formData.hours
      };

      const { error } = await supabase
        .from('restaurant_profiles')
        .insert([insertData]);

      if (error) throw error;

      showMessage('success', 'Restaurant créé avec succès ! Bienvenue sur CloudMenu ! 🎉');

      // Rediriger vers le dashboard après 2 secondes
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de la création du restaurant:', error);
      showMessage('error', 'Erreur lors de la création du restaurant');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="absolute right-0 top-0 text-gray-600 hover:text-gray-900 text-sm font-medium underline"
          >
            Passer cette étape
          </button>
          <img
            src="https://pub-f75ac4351c874e6f945cfc0ccd7d6d35.r2.dev/CloudMenu/CloudMenu.svg"
            alt="CloudMenu"
            className="h-12 mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue sur CloudMenu ! 👋
          </h1>
          <p className="text-gray-600">
            Configurons votre menu en quelques étapes simples
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[...Array(totalSteps)].map((_, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index + 1 <= currentStep
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                {index < totalSteps - 1 && (
                  <div 
                    className={`flex-1 h-2 mx-4 rounded transition-colors ${
                      index + 1 < currentStep ? 'bg-orange-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Informations de base</span>
            <span>Images</span>
            <span>Contact</span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
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

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Étape 1: Informations de base */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Informations de votre établissement
                </h2>
                <p className="text-gray-600 mb-6">
                  Commençons par les informations essentielles de votre restaurant.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du restaurant *
                </label>
                <input
                  type="text"
                  value={formData.restaurant_name}
                  onChange={(e) => handleInputChange('restaurant_name', e.target.value)}
                  placeholder="ex: Chez Antoine, Pizza Roma, Le Bistrot..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de votre restaurant
                </label>
                <div className="flex items-center">
                  <span className="bg-gray-50 px-3 py-3 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">
                    a.cloudmenu.fr/m/
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={formData.slug}
                      readOnly
                      className="w-full px-3 py-3 border border-gray-300 rounded-r-lg bg-gray-50 text-gray-600"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {slugChecking ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      ) : slugAvailable === true ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : slugAvailable === false ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : null}
                    </div>
                  </div>
                </div>
                {slugAvailable === false && (
                  <p className="mt-2 text-sm text-red-600">
                    Cette URL n'est pas disponible. Essayez un nom différent.
                  </p>
                )}
                {slugAvailable === true && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ Cette URL est disponible et sera réservée pour votre établissement.
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  💡 Cette URL sera définitive et servira à générer votre QR code.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Décrivez votre établissement en quelques mots..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* Étape 2: Images */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Images de votre établissement
                </h2>
                <p className="text-gray-600 mb-6">
                  Ajoutez un logo et une bannière pour personnaliser votre menu (optionnel).
                </p>
              </div>

              {/* Bannière */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Bannière du restaurant
                </label>
                <div className="space-y-3">
                  {formData.banner_url && (
                    <div className="relative">
                      <img
                        src={formData.banner_url}
                        alt="Bannière"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => handleInputChange('banner_url', '')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'banner');
                      }}
                      className="hidden"
                      disabled={uploadingBanner}
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                      {uploadingBanner ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                          <span className="text-orange-600">Upload en cours...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm font-medium text-gray-900">
                            Cliquer pour ajouter une bannière
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG jusqu'à 5MB</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Étape 3: Contact et réseaux sociaux */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Informations de contact
                </h2>
                <p className="text-gray-600 mb-6">
                  Ajoutez vos informations de contact pour que vos clients puissent vous joindre facilement.
                </p>
              </div>

              {/* Téléphone et WhatsApp */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline w-4 h-4 mr-1" />
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => handleInputChange('telephone', e.target.value)}
                    placeholder="01 23 45 67 89"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageCircle className="inline w-4 h-4 mr-1" />
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Réseaux sociaux */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Réseaux sociaux</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Instagram className="inline w-4 h-4 mr-1" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={formData.instagram}
                    onChange={(e) => handleInputChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/monrestaurant"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Facebook className="inline w-4 h-4 mr-1" />
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={formData.facebook}
                    onChange={(e) => handleInputChange('facebook', e.target.value)}
                    placeholder="https://facebook.com/monrestaurant"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="inline-block w-4 h-4 mr-1 bg-black rounded text-white text-xs flex items-center justify-center">
                      T
                    </div>
                    TikTok
                  </label>
                  <input
                    type="url"
                    value={formData.tiktok}
                    onChange={(e) => handleInputChange('tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@monrestaurant"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-8 mt-8 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
              <span>Précédent</span>
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!canProceedToNextStep()}
                className="flex items-center space-x-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Suivant</span>
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceedToNextStep()}
                className="flex items-center space-x-2 bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check size={20} />
                )}
                <span>{loading ? 'Création...' : 'Créer mon restaurant'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            En créant votre menu, vous acceptez nos{' '}
            <a href="#" className="text-orange-600 hover:underline">conditions d'utilisation</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;