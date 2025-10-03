import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Menu as MenuIcon, ChevronRight, Phone, MapPin, Clock, Globe, ChevronDown, Smartphone } from 'lucide-react';
import { supabase, RestaurantProfile, Menu } from '../../lib/supabase';
import LoadingSpinner from '../Layout/LoadingSpinner';
import QRCode from 'qrcode';

const LANGUAGES = {
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  it: { name: 'Italiano', flag: '🇮🇹' }
};

const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.split('-')[0];
  return Object.keys(LANGUAGES).includes(browserLang) ? browserLang : 'fr';
};

interface MenuGroup {
  menu_name: string;
  description?: string;
  languages: Menu[];
}

export default function RestaurantMenuSelection() {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(getBrowserLanguage());
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (slug) {
      loadRestaurantAndMenus();
      generateQRCode();
    }
  }, [slug]);

  const generateQRCode = async () => {
    try {
      const url = window.location.href;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const loadRestaurantAndMenus = async () => {
    setLoading(true);
    try {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurant_profiles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (restaurantError || !restaurantData) {
        console.error('Erreur lors du chargement du restaurant:', restaurantError);
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData);

      const { data: menusData, error: menusError } = await supabase
        .from('menus')
        .select('*')
        .eq('user_id', restaurantData.user_id)
        .eq('actif', true)
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (menusError) {
        console.error('Erreur lors du chargement des menus:', menusError);
        setMenus([]);
      } else {
        setMenus(menusData || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const allGroupedMenus: MenuGroup[] = menus.reduce((acc: MenuGroup[], menu) => {
    const existingGroup = acc.find(g => g.menu_name === menu.menu_name);
    if (existingGroup) {
      existingGroup.languages.push(menu);
    } else {
      acc.push({
        menu_name: menu.menu_name || menu.nom,
        description: menu.description,
        languages: [menu]
      });
    }
    return acc;
  }, []);

  const groupedMenus = allGroupedMenus.filter(group =>
    group.languages.some(m => m.language === selectedLanguage)
  );

  const availableLanguages = Array.from(new Set(menus.map(m => m.language || 'fr')));

  const getMenuForLanguage = (group: MenuGroup): Menu => {
    return group.languages.find(m => m.language === selectedLanguage)!;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant non trouvé</h2>
          <p className="text-gray-600">Ce restaurant n'existe pas ou a été désactivé.</p>
        </div>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full mb-6">
                <Smartphone className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {restaurant.restaurant_name}
              </h1>
              <p className="text-xl text-gray-600 mb-2">
                Menu Digital Interactif
              </p>
              <p className="text-gray-500">
                Scannez le QR code avec votre smartphone
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border-2 border-gray-200 inline-block mb-8">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              )}
            </div>

            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-start gap-3 text-gray-700">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold">
                  1
                </div>
                <p>Ouvrez l'appareil photo de votre smartphone</p>
              </div>
              <div className="flex items-start gap-3 text-gray-700">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold">
                  2
                </div>
                <p>Pointez vers le QR code ci-dessus</p>
              </div>
              <div className="flex items-start gap-3 text-gray-700">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold">
                  3
                </div>
                <p>Découvrez notre menu interactif</p>
              </div>
            </div>

            {restaurant.description && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-gray-600">{restaurant.description}</p>
              </div>
            )}

            {(restaurant.address || restaurant.telephone || restaurant.hours) && (
              <div className="mt-6 space-y-2 text-sm text-gray-600">
                {restaurant.address && (
                  <div className="flex items-center justify-center gap-2">
                    <MapPin size={16} />
                    <span>{restaurant.address}</span>
                  </div>
                )}
                {restaurant.telephone && (
                  <div className="flex items-center justify-center gap-2">
                    <Phone size={16} />
                    <span>{restaurant.telephone}</span>
                  </div>
                )}
                {restaurant.hours && (
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={16} />
                    <span>{restaurant.hours}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {restaurant.banner_url && (
        <div className="h-48 bg-gray-200 overflow-hidden">
          <img
            src={restaurant.banner_url}
            alt={restaurant.restaurant_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {restaurant.restaurant_name}
            </h1>

            {availableLanguages.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <Globe size={16} />
                  <span className="text-lg">{LANGUAGES[selectedLanguage]?.flag}</span>
                  <ChevronDown size={14} />
                </button>

                {showLanguageSelector && (
                  <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    {availableLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setShowLanguageSelector(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                          lang === selectedLanguage ? 'bg-orange-50 text-orange-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{LANGUAGES[lang]?.flag}</span>
                          <span className="text-sm">{LANGUAGES[lang]?.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {restaurant.description && (
            <p className="text-gray-600 text-sm mb-4">{restaurant.description}</p>
          )}

          <div className="space-y-2">
            {restaurant.address && (
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                <span>{restaurant.address}</span>
              </div>
            )}
            {restaurant.telephone && (
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Phone size={16} className="flex-shrink-0 mt-0.5" />
                <a href={`tel:${restaurant.telephone}`} className="hover:text-orange-600">
                  {restaurant.telephone}
                </a>
              </div>
            )}
            {restaurant.hours && (
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Clock size={16} className="flex-shrink-0 mt-0.5" />
                <span>{restaurant.hours}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {selectedLanguage === 'fr' ? 'Nos Menus' :
             selectedLanguage === 'en' ? 'Our Menus' :
             selectedLanguage === 'es' ? 'Nuestros Menús' :
             selectedLanguage === 'de' ? 'Unsere Menüs' :
             selectedLanguage === 'it' ? 'I Nostri Menu' : 'Nos Menus'}
          </h2>
          {groupedMenus.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <MenuIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">
                {selectedLanguage === 'fr' ? 'Aucun menu disponible pour le moment.' :
                 selectedLanguage === 'en' ? 'No menus available at the moment.' :
                 selectedLanguage === 'es' ? 'No hay menús disponibles en este momento.' :
                 selectedLanguage === 'de' ? 'Derzeit sind keine Menüs verfügbar.' :
                 selectedLanguage === 'it' ? 'Nessun menu disponibile al momento.' : 'Aucun menu disponible pour le moment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedMenus.map((group) => {
                const menu = getMenuForLanguage(group);
                const menuSlugPart = menu.slug.split('/').pop();
                const hasMultipleLanguages = group.languages.length > 1;

                return (
                  <Link
                    key={group.menu_name}
                    to={`/m/${slug}/${menuSlugPart}`}
                    className="block bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-orange-500 transition-all p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {hasMultipleLanguages && (
                            <span className="text-xl">{LANGUAGES[menu.language || 'fr']?.flag}</span>
                          )}
                          <h3 className="text-lg font-semibold text-gray-900">
                            {group.menu_name}
                          </h3>
                        </div>
                        {group.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
                        )}
                      </div>
                      <ChevronRight className="flex-shrink-0 ml-3 text-gray-400" size={20} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
