import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Upload, X, Check, Loader2, Building2, Phone, Instagram, Facebook, Music, MapPin, Clock, Star } from 'lucide-react';
import { supabase, RestaurantProfile, RestaurantProfileInsert, RestaurantProfileUpdate, uploadImage, deleteImage, generateSlug } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Layout/LoadingSpinner';

export default function RestaurantIdentity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    restaurant_name: '',
    slug: '',
    description: '',
    banner_url: '',
    logo_url: '',
    hero_background_color: '#f3f4f6',
    primary_color: '#ea580c',
    accent_color: '#f97316',
    text_color: '#1f2937',
    background_color: '#ffffff',
    telephone: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    address: '',
    hours: '',
    google_business_url: '',
    location: '',
    show_footer_branding: true
  });

  useEffect(() => {
    if (user) {
      loadRestaurantProfile();
    }
  }, [user]);

  const loadRestaurantProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setRestaurantProfile(data);
        setFormData({
          restaurant_name: data.restaurant_name,
          slug: data.slug,
          description: data.description || '',
          banner_url: data.banner_url || '',
          logo_url: data.logo_url || '',
          hero_background_color: data.hero_background_color || '#f3f4f6',
          primary_color: data.primary_color || '#ea580c',
          accent_color: data.accent_color || '#f97316',
          text_color: data.text_color || '#1f2937',
          background_color: data.background_color || '#ffffff',
          telephone: data.telephone || '',
          whatsapp: data.whatsapp || '',
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          tiktok: data.tiktok || '',
          address: data.address || '',
          hours: data.hours || '',
          google_business_url: data.google_business_url || '',
          location: data.location || '',
          show_footer_branding: data.show_footer_branding !== undefined ? data.show_footer_branding : true
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      showMessage('error', 'Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'show_footer_branding') {
      setFormData(prev => ({ ...prev, [field]: value === 'true' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    if (field === 'restaurant_name' && !restaurantProfile) {
      const slug = generateSlug(value);
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleImageUpload = async (file: File, field: 'banner_url' | 'logo_url') => {
    if (!user) return;

    setUploading(true);
    try {
      const oldImageUrl = formData[field];
      const folder = field === 'banner_url' ? 'bannieres' : 'logos';
      const result = await uploadImage(file, folder);

      if (result.error) {
        showMessage('error', result.error);
        return;
      }

      if (oldImageUrl) {
        await deleteImage(oldImageUrl);
      }

      setFormData(prev => ({ ...prev, [field]: result.url }));
      showMessage('success', 'Image téléchargée avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      showMessage('error', 'Erreur lors du téléchargement de l\'image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.restaurant_name.trim()) {
      showMessage('error', 'Le nom du restaurant est requis');
      return;
    }

    if (!formData.slug.trim()) {
      showMessage('error', 'Le slug est requis');
      return;
    }

    setSaving(true);
    try {
      if (restaurantProfile) {
        const updateData: RestaurantProfileUpdate = {
          restaurant_name: formData.restaurant_name,
          slug: formData.slug,
          description: formData.description,
          banner_url: formData.banner_url,
          logo_url: formData.logo_url,
          hero_background_color: formData.hero_background_color,
          primary_color: formData.primary_color,
          accent_color: formData.accent_color,
          text_color: formData.text_color,
          background_color: formData.background_color,
          telephone: formData.telephone,
          whatsapp: formData.whatsapp,
          instagram: formData.instagram,
          facebook: formData.facebook,
          tiktok: formData.tiktok,
          address: formData.address,
          hours: formData.hours,
          google_business_url: formData.google_business_url,
          location: formData.location,
          show_footer_branding: formData.show_footer_branding
        };

        const { error } = await supabase
          .from('restaurant_profiles')
          .update(updateData)
          .eq('id', restaurantProfile.id);

        if (error) throw error;

        showMessage('success', 'Profil mis à jour avec succès');
      } else {
        const insertData: RestaurantProfileInsert = {
          user_id: user.id,
          restaurant_name: formData.restaurant_name,
          slug: formData.slug,
          description: formData.description,
          banner_url: formData.banner_url,
          logo_url: formData.logo_url,
          hero_background_color: formData.hero_background_color,
          primary_color: formData.primary_color,
          accent_color: formData.accent_color,
          text_color: formData.text_color,
          background_color: formData.background_color,
          telephone: formData.telephone,
          whatsapp: formData.whatsapp,
          instagram: formData.instagram,
          facebook: formData.facebook,
          tiktok: formData.tiktok,
          address: formData.address,
          hours: formData.hours,
          google_business_url: formData.google_business_url,
          location: formData.location,
          show_footer_branding: formData.show_footer_branding
        };

        const { data, error } = await supabase
          .from('restaurant_profiles')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;

        setRestaurantProfile(data);
        showMessage('success', 'Profil créé avec succès');
      }

      await loadRestaurantProfile();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showMessage('error', 'Erreur lors de la sauvegarde du profil');
    } finally {
      setSaving(false);
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
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? <Check size={20} /> : <X size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Identité Visuelle</h1>
          <p className="text-gray-600">
            Configurez l'identité visuelle et les informations de votre restaurant
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Building2 size={20} />
              <span>Informations générales</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du restaurant
                </label>
                <input
                  type="text"
                  value={formData.restaurant_name}
                  onChange={(e) => handleInputChange('restaurant_name', e.target.value)}
                  placeholder="ex: Chez Antoine"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de votre restaurant
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">cloudmenu.fr/m/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    placeholder="mon-restaurant"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    disabled={!!restaurantProfile}
                  />
                </div>
                {restaurantProfile && (
                  <p className="mt-1 text-xs text-gray-500">
                    L'URL ne peut pas être modifiée après la création
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Décrivez votre restaurant en quelques mots..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin size={16} className="inline mr-1" />
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Rue de la Paix, 75001 Paris"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock size={16} className="inline mr-1" />
                  Horaires
                </label>
                <input
                  type="text"
                  value={formData.hours}
                  onChange={(e) => handleInputChange('hours', e.target.value)}
                  placeholder="Lun-Ven: 12h-14h, 19h-22h"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin size={16} className="inline mr-1" />
                  Localisation (Google Maps)
                </label>
                <input
                  type="url"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="https://www.google.com/maps/place/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-gray-700 font-medium mb-1">💡 Comment obtenir le bon lien :</p>
                  <ol className="text-xs text-gray-600 space-y-1 ml-4 list-decimal">
                    <li>Ouvrez Google Maps et trouvez votre restaurant</li>
                    <li>Cliquez sur "Partager" puis "Intégrer une carte"</li>
                    <li>Copiez le lien dans <code className="bg-white px-1 rounded">src="..."</code></li>
                    <li>Ou utilisez directement l'URL de la page (ex: google.com/maps/place/...)</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Images</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bannière
                </label>
                {formData.banner_url ? (
                  <div className="relative">
                    <img
                      src={formData.banner_url}
                      alt="Bannière"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, banner_url: '' }))}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Cliquez pour télécharger une bannière</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'banner_url')}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo
                </label>
                {formData.logo_url ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.logo_url}
                      alt="Logo"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <Upload className="w-8 h-8 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-600">Logo</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo_url')}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Palette de Couleurs</h2>
            <p className="text-sm text-gray-600 mb-6">Personnalisez les couleurs de votre page de menu</p>

            {/* Preset Color Themes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Thèmes prédéfinis</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: 'Orange Classic', primary: '#ea580c', accent: '#f97316', text: '#1f2937', bg: '#ffffff', hero: '#fff7ed' },
                  { name: 'Rouge Passion', primary: '#dc2626', accent: '#ef4444', text: '#1f2937', bg: '#ffffff', hero: '#fef2f2' },
                  { name: 'Vert Nature', primary: '#16a34a', accent: '#22c55e', text: '#1f2937', bg: '#ffffff', hero: '#f0fdf4' },
                  { name: 'Bleu Océan', primary: '#2563eb', accent: '#3b82f6', text: '#1f2937', bg: '#ffffff', hero: '#eff6ff' },
                  { name: 'Violet Royal', primary: '#7c3aed', accent: '#8b5cf6', text: '#1f2937', bg: '#ffffff', hero: '#f5f3ff' },
                  { name: 'Rose Élégant', primary: '#db2777', accent: '#ec4899', text: '#1f2937', bg: '#ffffff', hero: '#fdf2f8' },
                  { name: 'Sombre Chic', primary: '#f59e0b', accent: '#fbbf24', text: '#f9fafb', bg: '#111827', hero: '#1f2937' },
                  { name: 'Minimaliste', primary: '#374151', accent: '#6b7280', text: '#111827', bg: '#ffffff', hero: '#f9fafb' }
                ].map((theme) => (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        primary_color: theme.primary,
                        accent_color: theme.accent,
                        text_color: theme.text,
                        background_color: theme.bg,
                        hero_background_color: theme.hero
                      }));
                    }}
                    className="p-3 border-2 border-gray-200 rounded-lg hover:border-orange-500 transition-colors text-left"
                  >
                    <div className="flex gap-1.5 mb-2">
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.primary }}></div>
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.accent }}></div>
                      <div className="w-6 h-6 rounded border border-gray-200" style={{ backgroundColor: theme.bg }}></div>
                    </div>
                    <p className="text-xs font-medium text-gray-700">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur Principale</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    className="w-16 h-16 border-2 border-gray-300 rounded-lg cursor-pointer"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      placeholder="#ea580c"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Utilisée pour les boutons et liens principaux</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur d'Accentuation</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => handleInputChange('accent_color', e.target.value)}
                    className="w-16 h-16 border-2 border-gray-300 rounded-lg cursor-pointer"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.accent_color}
                      onChange={(e) => handleInputChange('accent_color', e.target.value)}
                      placeholder="#f97316"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Utilisée pour les hovers et éléments secondaires</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur du Texte</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.text_color}
                    onChange={(e) => handleInputChange('text_color', e.target.value)}
                    className="w-16 h-16 border-2 border-gray-300 rounded-lg cursor-pointer"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.text_color}
                      onChange={(e) => handleInputChange('text_color', e.target.value)}
                      placeholder="#1f2937"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Couleur principale du texte</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur de Fond du Hero</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.hero_background_color}
                    onChange={(e) => handleInputChange('hero_background_color', e.target.value)}
                    className="w-16 h-16 border-2 border-gray-300 rounded-lg cursor-pointer"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.hero_background_color}
                      onChange={(e) => handleInputChange('hero_background_color', e.target.value)}
                      placeholder="#f3f4f6"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Couleur de fond de la section hero en haut</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact & Réseaux Sociaux</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone size={16} className="inline mr-1" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => handleInputChange('telephone', e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Instagram size={16} className="inline mr-1" />
                  Instagram
                </label>
                <input
                  type="url"
                  value={formData.instagram}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Facebook size={16} className="inline mr-1" />
                  Facebook
                </label>
                <input
                  type="url"
                  value={formData.facebook}
                  onChange={(e) => handleInputChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Music size={16} className="inline mr-1" />
                  TikTok
                </label>
                <input
                  type="url"
                  value={formData.tiktok}
                  onChange={(e) => handleInputChange('tiktok', e.target.value)}
                  placeholder="https://tiktok.com/@..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Star size={16} className="inline mr-1" />
                  Google My Business
                </label>
                <input
                  type="url"
                  value={formData.google_business_url}
                  onChange={(e) => handleInputChange('google_business_url', e.target.value)}
                  placeholder="https://g.page/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Les clients pourront voir vos avis Google et laisser un avis depuis votre page
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Paramètres du Footer</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Afficher le branding CloudMenu
                  </label>
                  <p className="text-xs text-gray-500">
                    Afficher "Propulsé par CloudMenu" dans le footer
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('show_footer_branding', (!formData.show_footer_branding).toString())}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.show_footer_branding ? 'bg-orange-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.show_footer_branding ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex items-center space-x-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
