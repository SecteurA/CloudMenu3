import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Menu as MenuIcon, ChevronRight, Phone, MapPin, Clock, Globe, ChevronDown, Smartphone, Check, MessageCircle, Instagram, Facebook, Calendar, X } from 'lucide-react';
import { supabase, RestaurantProfile, Menu } from '../../lib/supabase';
import LoadingSpinner from '../Layout/LoadingSpinner';
import GoogleBusinessRating from './GoogleBusinessRating';
import RestaurantFooter from './RestaurantFooter';
import QRCode from 'qrcode';
import { useInterfaceTranslations, getTranslation } from '../../hooks/useInterfaceTranslations';
import { getColorClasses, injectCustomStyles } from '../../utils/colorUtils';

const LANGUAGES: Record<string, { name: string; flag: string }> = {
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  ar: { name: 'العربية', flag: '🇸🇦' },
  ja: { name: '日本語', flag: '🇯🇵' },
  zh: { name: '中文', flag: '🇨🇳' },
  pt: { name: 'Português', flag: '🇵🇹' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  hi: { name: 'हिन्दी', flag: '🇮🇳' },
  ko: { name: '한국어', flag: '🇰🇷' }
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
  const [selectedLanguage, setSelectedLanguage] = useState<string>('fr');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [menuLanguages, setMenuLanguages] = useState<string[]>([]);
  const [menuTitleTranslations, setMenuTitleTranslations] = useState<Record<string, Record<string, string>>>({});

  // Fetch ALL interface translations at once to avoid race conditions between child components
  const { translations: interfaceTranslations, loading: translationsLoading } = useInterfaceTranslations(
    selectedLanguage,
    [
      'our_menus',
      'no_menus_available',
      'reserve',
      'book_table',
      'contact_us_directly',
      'leave_review',
      'write_review_google',
      'contact',
      'follow_us',
      'powered_by',
      'our_location',
      'all_rights_reserved'
    ]
  );

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

        // Fetch available languages from menu_languages table
        if (menusData && menusData.length > 0) {
          const menuIds = menusData.map(m => m.id);
          const { data: languagesData } = await supabase
            .from('menu_languages')
            .select('language_code, menu_id, menu_title')
            .in('menu_id', menuIds);

          if (languagesData) {
            const uniqueLanguages = Array.from(new Set(languagesData.map(l => l.language_code)));
            // Add default language from menus
            const defaultLanguages = menusData.map(m => m.default_language || 'fr');
            const allLanguages = Array.from(new Set([...defaultLanguages, ...uniqueLanguages]));
            setMenuLanguages(allLanguages);

            // Auto-detect browser language and set if available
            const browserLang = getBrowserLanguage();
            if (allLanguages.includes(browserLang)) {
              setSelectedLanguage(browserLang);
            } else if (allLanguages.length > 0) {
              setSelectedLanguage(allLanguages[0]);
            }

            // Store menu title translations: { menuId: { languageCode: title } }
            const translations: Record<string, Record<string, string>> = {};
            languagesData.forEach(lang => {
              if (!translations[lang.menu_id]) {
                translations[lang.menu_id] = {};
              }
              translations[lang.menu_id][lang.language_code] = lang.menu_title || '';
            });
            setMenuTitleTranslations(translations);
          }
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply custom colors when restaurant data is loaded
  useEffect(() => {
    if (restaurant) {
      const colors = getColorClasses(restaurant);
      injectCustomStyles(colors);
    }
  }, [restaurant]);

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

  // Show ALL menus always - no filtering based on language
  // Menus without translations will be shown in their default language
  const groupedMenus = allGroupedMenus;

  const availableLanguages = Array.from(new Set(menus.map(m => m.language || 'fr')));

  const getMenuForLanguage = (group: MenuGroup): Menu => {
    // Since translations are stored separately, always return the base menu
    // The translated content will be fetched from menu_languages table
    return group.languages[0];
  };

  const formatWhatsAppLink = (whatsapp: string) => {
    const cleanNumber = whatsapp.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}`;
  };

  const getTranslatedMenuTitle = (menuId: string, languageCode: string, defaultTitle: string): string => {
    // If it's the default language, return the default title
    const menu = menus.find(m => m.id === menuId);
    if (menu && menu.default_language === languageCode) {
      return defaultTitle;
    }
    // Otherwise, get the translated title, or fallback to default
    return menuTitleTranslations[menuId]?.[languageCode] || defaultTitle;
  };

  const hasMenuTranslation = (menuId: string, languageCode: string): boolean => {
    const menu = menus.find(m => m.id === menuId);
    if (menu && menu.default_language === languageCode) {
      return true; // Default language always available
    }
    return !!(menuTitleTranslations[menuId]?.[languageCode]);
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
    <div className="min-h-screen bg-gray-50 pb-20" dir={selectedLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Navbar fixe */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-16 flex items-center justify-end px-4">
          {/* Desktop/Tablet: Language selector and Contact icons */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Language Selector */}
            {menuLanguages.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <Globe size={18} />
                  <span className="text-xl">{LANGUAGES[selectedLanguage]?.flag || '🌐'}</span>
                  <span className="text-sm font-medium">{LANGUAGES[selectedLanguage]?.name || selectedLanguage}</span>
                  <ChevronDown size={16} />
                </button>
                {showLanguageSelector && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    {menuLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setShowLanguageSelector(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedLanguage === lang ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{LANGUAGES[lang]?.flag}</span>
                            <span className="text-sm">{LANGUAGES[lang]?.name}</span>
                          </div>
                          {selectedLanguage === lang && <Check size={16} />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="w-px h-6 bg-gray-300"></div>

            {/* Contact icons */}
            <div className="flex items-center space-x-2">
              {restaurant.telephone && (
                <a
                  href={`tel:${restaurant.telephone}`}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  title={`Appeler ${restaurant.telephone}`}
                >
                  <Phone size={20} />
                </a>
              )}

              {restaurant.whatsapp && (
                <a
                  href={formatWhatsAppLink(restaurant.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                  title={`WhatsApp ${restaurant.whatsapp}`}
                >
                  <MessageCircle size={20} />
                </a>
              )}

              {restaurant.instagram && (
                <a
                  href={restaurant.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200"
                  title="Suivez-nous sur Instagram"
                >
                  <Instagram size={20} />
                </a>
              )}

              {restaurant.facebook && (
                <a
                  href={restaurant.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  title="Suivez-nous sur Facebook"
                >
                  <Facebook size={20} />
                </a>
              )}

              {restaurant.tiktok && (
                <a
                  href={restaurant.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  title="Suivez-nous sur TikTok"
                >
                  <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">T</span>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* Mobile: Booking button, Language selector, and Hamburger menu */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Booking button - highlighted */}
            <button
              onClick={() => setShowBookingModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg shadow-sm hover:bg-orange-700 transition-all"
            >
              <Calendar size={18} />
              <span className="text-sm font-medium">{getTranslation(interfaceTranslations, 'reserve', 'Réserver')}</span>
            </button>

            {menuLanguages.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <span className="text-xl">{LANGUAGES[selectedLanguage]?.flag || '🌐'}</span>
                  <ChevronDown size={16} />
                </button>

                {showLanguageSelector && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    {menuLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setShowLanguageSelector(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          lang === selectedLanguage ? 'bg-orange-50 text-orange-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{LANGUAGES[lang]?.flag}</span>
                            <span className="text-sm">{LANGUAGES[lang]?.name}</span>
                          </div>
                          {selectedLanguage === lang && <Check size={16} />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hamburger menu button */}
            {(restaurant.telephone || restaurant.whatsapp || restaurant.instagram || restaurant.facebook || restaurant.tiktok) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MenuIcon size={24} className="text-black" />
              </button>
            )}
          </div>

          {/* Hamburger dropdown menu */}
          {isMenuOpen && (restaurant.telephone || restaurant.whatsapp || restaurant.instagram || restaurant.facebook || restaurant.tiktok) && (
            <div className="absolute top-full left-0 right-0 w-full bg-white shadow-xl border-b border-gray-200 z-50 md:left-auto md:right-0 md:w-80 md:border-l">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-lg">Nous contacter</h3>
              </div>

              <div className="py-1">
                {restaurant.telephone && (
                  <a
                    href={`tel:${restaurant.telephone}`}
                    className="flex items-center space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Téléphone</div>
                      <div className="text-sm text-gray-600">{restaurant.telephone}</div>
                    </div>
                  </a>
                )}

                {restaurant.whatsapp && (
                  <a
                    href={formatWhatsAppLink(restaurant.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle size={18} className="text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">WhatsApp</div>
                      <div className="text-sm text-gray-600">{restaurant.whatsapp}</div>
                    </div>
                  </a>
                )}

                {restaurant.instagram && (
                  <a
                    href={restaurant.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50"
                  >
                    <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Instagram size={18} className="text-pink-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Instagram</div>
                      <div className="text-sm text-gray-600">Suivez-nous</div>
                    </div>
                  </a>
                )}

                {restaurant.facebook && (
                  <a
                    href={restaurant.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Facebook size={18} className="text-blue-700" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Facebook</div>
                      <div className="text-sm text-gray-600">Suivez-nous</div>
                    </div>
                  </a>
                )}

                {restaurant.tiktok && (
                  <a
                    href={restaurant.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">T</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">TikTok</div>
                      <div className="text-sm text-gray-600">Suivez-nous</div>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main content with padding for fixed navbar */}
      <div className="pt-16">
        {/* Hero section with logo or banner */}
        <div
          className="h-48 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: restaurant.hero_background_color || '#f3f4f6' }}
        >
          {restaurant.logo_url ? (
            <div className="flex items-center justify-center h-full px-4">
              <img
                src={restaurant.logo_url}
                alt={restaurant.restaurant_name}
                className="max-h-32 max-w-full object-contain"
              />
            </div>
          ) : restaurant.banner_url ? (
            <img
              src={restaurant.banner_url}
              alt={restaurant.restaurant_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center px-4">
              <h2 className="text-2xl font-bold text-gray-900">{restaurant.restaurant_name}</h2>
            </div>
          )}
        </div>

        <div className="px-4 py-6">
          {(restaurant.description || restaurant.address || restaurant.hours) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
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
              {restaurant.hours && (
                <div className="flex items-start space-x-2 text-sm text-gray-600">
                  <Clock size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{restaurant.hours}</span>
                </div>
              )}
            </div>
            </div>
          )}
        </div>

        <div className="px-4 py-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {getTranslation(interfaceTranslations, 'our_menus', 'Nos Menus')}
          </h2>
          {groupedMenus.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <MenuIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">
                {getTranslation(interfaceTranslations, 'no_menus_available', 'Aucun menu disponible pour le moment.')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedMenus.map((group) => {
                const menu = getMenuForLanguage(group);
                const menuSlugPart = menu.slug.split('/').pop();
                const translatedTitle = getTranslatedMenuTitle(menu.id, selectedLanguage, group.menu_name);
                const hasTranslation = hasMenuTranslation(menu.id, selectedLanguage);
                const defaultLang = menu.default_language || 'fr';

                return (
                  <Link
                    key={group.menu_name}
                    to={`/m/${slug}/${menuSlugPart}?lang=${selectedLanguage}`}
                    className="block bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-orange-500 transition-all p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {translatedTitle}
                          </h3>
                          {!hasTranslation && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              {LANGUAGES[defaultLang]?.flag || '🌐'} {LANGUAGES[defaultLang]?.name || defaultLang.toUpperCase()}
                            </span>
                          )}
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

        {restaurant.google_business_url && (
          <div className="px-4 mb-6">
            <GoogleBusinessRating
              googleBusinessUrl={restaurant.google_business_url}
              selectedLanguage={selectedLanguage}
              translations={interfaceTranslations}
            />
          </div>
        )}
      </div>

      <RestaurantFooter
        restaurant={restaurant}
        selectedLanguage={selectedLanguage}
        translations={interfaceTranslations}
      />

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{getTranslation(interfaceTranslations, 'book_table', 'Réserver une table')}</h2>
              <button
                onClick={() => setShowBookingModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {getTranslation(interfaceTranslations, 'contact_us_directly', 'Pour réserver une table, veuillez nous contacter directement :')}
              </p>
              <div className="space-y-3">
                {restaurant.telephone && (
                  <a
                    href={`tel:${restaurant.telephone}`}
                    className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Phone size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Téléphone</div>
                      <div className="text-sm text-gray-600">{restaurant.telephone}</div>
                    </div>
                  </a>
                )}
                {restaurant.whatsapp && (
                  <a
                    href={formatWhatsAppLink(restaurant.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageCircle size={20} className="text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">WhatsApp</div>
                      <div className="text-sm text-gray-600">{restaurant.whatsapp}</div>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
