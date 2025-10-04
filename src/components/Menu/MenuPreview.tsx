import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Menu, Category, MenuItem, RestaurantProfile, trackMenuVisit } from '../../lib/supabase';
import { Loader2, AlertCircle, Leaf, Flame, Menu as MenuIcon, Phone, MessageCircle, Instagram, Facebook, X, Calendar, Clock, Users, Check, Globe, ChevronDown, LayoutGrid, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';

const LANGUAGES = {
  fr: { name: 'Français', flag: '🇫🇷', rtl: false },
  en: { name: 'English', flag: '🇬🇧', rtl: false },
  es: { name: 'Español', flag: '🇪🇸', rtl: false },
  de: { name: 'Deutsch', flag: '🇩🇪', rtl: false },
  it: { name: 'Italiano', flag: '🇮🇹', rtl: false },
  pt: { name: 'Português', flag: '🇵🇹', rtl: false },
  ar: { name: 'العربية', flag: '🇸🇦', rtl: true },
  zh: { name: '中文', flag: '🇨🇳', rtl: false },
  ja: { name: '日本語', flag: '🇯🇵', rtl: false },
  ru: { name: 'Русский', flag: '🇷🇺', rtl: false },
  nl: { name: 'Nederlands', flag: '🇳🇱', rtl: false }
};

interface MenuLanguage {
  id: string;
  language_code: string;
  is_default: boolean;
}

interface CategoryTranslation {
  category_id: string;
  nom: string;
  description: string;
}

interface ItemTranslation {
  menu_item_id: string;
  nom: string;
  description: string;
}

const MenuPreview = () => {
  const navigate = useNavigate();
  const { slug, menuSlug } = useParams<{ slug: string; menuSlug: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [visitTracked, setVisitTracked] = useState(false);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  // État pour le menu hamburger
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMenuSelector, setShowMenuSelector] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // Translation states
  const [currentLanguage, setCurrentLanguage] = useState<string>('fr');
  const [availableLanguages, setAvailableLanguages] = useState<MenuLanguage[]>([]);
  const [categoryTranslations, setCategoryTranslations] = useState<Record<string, CategoryTranslation>>({});
  const [itemTranslations, setItemTranslations] = useState<Record<string, ItemTranslation>>({});
  
  // États pour la réservation
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationMessage, setReservationMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [reservationData, setReservationData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    party_size: 2,
    reservation_date: '',
    reservation_time: '',
    special_requests: ''
  });
  
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (slug && menuSlug) {
      loadMenu();
      generateQRCode();
    }
  }, [slug, menuSlug]);

  useEffect(() => {
    if (menu && currentLanguage) {
      loadTranslations(currentLanguage);
    }
  }, [currentLanguage, menu, categories, menuItems]);

  useEffect(() => {
    if (menu && !currentLanguage) {
      setCurrentLanguage(menu.default_language || 'fr');
    }
  }, [menu]);

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

  // Track visit when menu loads
  useEffect(() => {
    if (menu && !visitTracked) {
      // Check visit type based on ref parameter
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      let visitType: 'qr_scan' | 'direct_link' | 'gmb' = 'direct_link';
      
      if (ref === 'qr') {
        visitType = 'qr_scan';
      } else if (ref === 'gmb') {
        visitType = 'gmb';
      }
      
      trackMenuVisit(menu.id, visitType);
      setVisitTracked(true);
    }
  }, [menu, visitTracked]);

  useEffect(() => {
    // Set first category as active when categories load
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories]);

  // Auto-scroll horizontal navigation to show active category
  useEffect(() => {
    if (activeCategory && categoryButtonRefs.current[activeCategory] && navRef.current) {
      const activeButton = categoryButtonRefs.current[activeCategory];
      const navContainer = navRef.current;
      
      const buttonRect = activeButton.getBoundingClientRect();
      const navRect = navContainer.getBoundingClientRect();
      
      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;
      const navScrollLeft = navContainer.scrollLeft;
      const navWidth = navContainer.offsetWidth;
      
      // Check if button is outside visible area
      if (buttonLeft < navScrollLeft) {
        // Button is to the left of visible area
        navContainer.scrollTo({
          left: buttonLeft - 20, // Add some padding
          behavior: 'smooth'
        });
      } else if (buttonLeft + buttonWidth > navScrollLeft + navWidth) {
        // Button is to the right of visible area
        navContainer.scrollTo({
          left: buttonLeft + buttonWidth - navWidth + 20, // Add some padding
          behavior: 'smooth'
        });
      }
    }
  }, [activeCategory]);

  const loadMenu = async () => {
    if (!slug || !menuSlug) {
      setError('Paramètres manquants');
      setLoading(false);
      return;
    }

    try {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurant_profiles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (restaurantError || !restaurantData) {
        setError('Restaurant non trouvé');
        setLoading(false);
        return;
      }

      setRestaurantProfile(restaurantData);

      const { data: menusData, error: menusError } = await supabase
        .from('menus')
        .select('*')
        .eq('user_id', restaurantData.user_id)
        .eq('actif', true)
        .eq('status', 'published');

      if (menusError) {
        setError('Erreur lors du chargement des menus');
        setLoading(false);
        return;
      }

      setAllMenus(menusData || []);

      const targetMenu = menusData?.find(m => {
        const menuSlugPart = m.slug.split('/').pop();
        return menuSlugPart === menuSlug;
      });

      if (!targetMenu) {
        setError('Menu non trouvé');
        setLoading(false);
        return;
      }

      setMenu(targetMenu);
      await loadMenuContent(targetMenu.id);
    } catch (error) {
      setError('Erreur lors du chargement du menu');
    } finally {
      setLoading(false);
    }
  };

  const loadMenuContent = async (menuId: string) => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('menu_id', menuId)
        .eq('actif', true)
        .order('ordre', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      if (categoriesData && categoriesData.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .in('category_id', categoriesData.map(c => c.id))
          .eq('disponible', true)
          .order('ordre', { ascending: true });

        if (itemsError) throw itemsError;

        const itemsByCategory: Record<string, MenuItem[]> = {};
        categoriesData.forEach(category => {
          itemsByCategory[category.id] = itemsData?.filter(item => item.category_id === category.id) || [];
        });
        setMenuItems(itemsByCategory);
      }

      // Load available languages
      const { data: languages } = await supabase
        .from('menu_languages')
        .select('*')
        .eq('menu_id', menuId);

      setAvailableLanguages(languages || []);
    } catch (error) {
      console.error('Erreur lors du chargement du contenu:', error);
    }
  };

  const loadTranslations = async (languageCode: string) => {
    if (!menu || !languageCode || languageCode === (menu.default_language || 'fr')) {
      setCategoryTranslations({});
      setItemTranslations({});
      return;
    }

    try {
      const categoryIds = categories.map(c => c.id);

      // Load category translations
      const { data: catTrans } = await supabase
        .from('category_translations')
        .select('*')
        .in('category_id', categoryIds)
        .eq('language_code', languageCode);

      const catMap: Record<string, CategoryTranslation> = {};
      catTrans?.forEach(t => {
        catMap[t.category_id] = t;
      });
      setCategoryTranslations(catMap);

      // Load item translations
      const allItemIds: string[] = [];
      Object.values(menuItems).forEach(items => {
        items.forEach(item => allItemIds.push(item.id));
      });

      if (allItemIds.length > 0) {
        const { data: itemTrans } = await supabase
          .from('menu_item_translations')
          .select('*')
          .in('menu_item_id', allItemIds)
          .eq('language_code', languageCode);

        const itemMap: Record<string, ItemTranslation> = {};
        itemTrans?.forEach(t => {
          itemMap[t.menu_item_id] = t;
        });
        setItemTranslations(itemMap);
      }
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  };

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = categoryRefs.current[categoryId];
    if (element) {
      const headerHeight = 140; // Height of banner + logo + nav
      const elementPosition = element.offsetTop - headerHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  // Handle scroll to highlight active category
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 250; // Position du viewport + offset pour la navigation sticky
      
      let closestCategory = '';
      let closestDistance = Infinity;
      
      // Trouver la catégorie vraiment active
      for (const category of categories) {
        const element = categoryRefs.current[category.id];
        if (element) {
          const categoryTop = element.offsetTop;
          const categoryBottom = categoryTop + element.offsetHeight;
          
          // La catégorie doit occuper au moins 60% du viewport pour être considérée active
          const visibleTop = Math.max(categoryTop, scrollPosition - 150);
          const visibleBottom = Math.min(categoryBottom, scrollPosition + 200);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          const categoryHeight = categoryBottom - categoryTop;
          const visibilityRatio = visibleHeight / Math.min(categoryHeight, 350); // Max 350px pour le calcul
          
          if (visibilityRatio > 0.4) { // Au moins 40% de la catégorie doit être visible
            closestCategory = category.id;
            break;
          }
          
          // Sinon, prioriser les catégories qui arrivent (pas celles qui partent)
          const distanceFromTop = categoryTop - scrollPosition;
          if (distanceFromTop > 0 && distanceFromTop < closestDistance) {
            closestDistance = distanceFromTop;
            closestCategory = category.id;
          }
        }
      }
      
      // Si aucune catégorie n'est suffisamment visible, garder la plus proche
      if (!closestCategory) {
        closestDistance = Infinity;
        for (const category of categories) {
          const element = categoryRefs.current[category.id];
          if (element) {
            const categoryTop = element.offsetTop;
            const distanceFromTop = Math.abs(categoryTop - scrollPosition);
            if (distanceFromTop < closestDistance) {
              closestDistance = distanceFromTop;
              closestCategory = category.id;
            }
          }
        }
      }
      
      if (closestCategory && closestCategory !== activeCategory) {
        setActiveCategory(closestCategory);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, activeCategory]);

  // Fermer le menu en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  const formatWhatsAppLink = (phone: string) => {
    // Nettoyer le numéro et le formater pour WhatsApp
    const cleanPhone = phone.replace(/\D/g, '');
    // Ajouter le code pays français si pas déjà présent
    const formattedPhone = cleanPhone.startsWith('33') ? cleanPhone : `33${cleanPhone.substring(1)}`;
    return `https://wa.me/${formattedPhone}`;
  };

  const showReservationMessage = (type: 'success' | 'error', text: string) => {
    setReservationMessage({ type, text });
    setTimeout(() => setReservationMessage(null), 5000);
  };

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reservationData.customer_name.trim() || !reservationData.customer_phone.trim() ||
        !reservationData.reservation_date || !reservationData.reservation_time) {
      showReservationMessage('error', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setReservationLoading(true);

    try {
      const { error } = await supabase
        .from('reservations')
        .insert([{
          menu_id: menu!.id,
          customer_name: reservationData.customer_name,
          customer_email: null,
          customer_phone: reservationData.customer_phone,
          party_size: reservationData.party_size,
          reservation_date: reservationData.reservation_date,
          reservation_time: reservationData.reservation_time,
          special_requests: reservationData.special_requests || null,
          status: 'pending'
        }]);

      if (error) throw error;

      showReservationMessage('success', 'Votre réservation a été envoyée avec succès ! Le restaurant vous contactera pour confirmer.');
      setReservationData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        party_size: 2,
        reservation_date: '',
        reservation_time: '',
        special_requests: ''
      });

      // Fermer le formulaire après 3 secondes
      setTimeout(() => {
        setShowReservationForm(false);
      }, 3000);

    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      showReservationMessage('error', 'Erreur lors de l\'envoi de la réservation. Veuillez réessayer.');
    } finally {
      setReservationLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const isRTL = () => {
    return LANGUAGES[currentLanguage as keyof typeof LANGUAGES]?.rtl || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Chargement du menu...</span>
        </div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Menu non trouvé</h1>
          <p className="text-gray-600">{error || 'Ce menu n\'existe pas ou n\'est pas disponible.'}</p>
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
                {restaurantProfile?.restaurant_name || menu.nom}
              </h1>
              <p className="text-2xl font-semibold text-gray-800 mb-2">
                {menu.menu_name || menu.nom}
              </p>
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

            {menu.description && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-gray-600">{menu.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      dir={isRTL() ? 'rtl' : 'ltr'}
      style={{
        backgroundColor: menu.couleur_fond,
        color: menu.couleur_texte
      }}
    >
      {/* Navbar fixe */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-16 flex items-center justify-between px-4">
          {/* Logo texte (nom du restaurant) - clickable to go to restaurant landing */}
          <h1
            className="text-xl font-bold truncate cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: '#000000' }}
            onClick={() => navigate(`/m/${slug}`)}
          >
            {menu.nom}
          </h1>

          {/* Desktop: Language selector and Contact icons */}
          <div className={`hidden lg:flex items-center ${isRTL() ? 'space-x-reverse' : ''} space-x-2`}>
            {/* Language Selector */}
            {availableLanguages.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLanguageSelector(!showLanguageSelector);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <Globe size={18} />
                  <span className="text-xl">{LANGUAGES[currentLanguage]?.flag || '🌐'}</span>
                  <span className="text-sm font-medium">{LANGUAGES[currentLanguage]?.name || currentLanguage}</span>
                  <ChevronDown size={16} />
                </button>
                {showLanguageSelector && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    <button
                      onClick={() => {
                        setCurrentLanguage(menu.default_language || 'fr');
                        setShowLanguageSelector(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${currentLanguage === menu.default_language ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{LANGUAGES[menu.default_language || 'fr']?.flag}</span>
                          <span className="text-sm">{LANGUAGES[menu.default_language || 'fr']?.name}</span>
                        </div>
                        {currentLanguage === menu.default_language && <Check size={16} />}
                      </div>
                    </button>
                    {availableLanguages.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => {
                          setCurrentLanguage(lang.language_code);
                          setShowLanguageSelector(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${currentLanguage === lang.language_code ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{LANGUAGES[lang.language_code]?.flag || '🌐'}</span>
                            <span className="text-sm">{LANGUAGES[lang.language_code]?.name || lang.language_code}</span>
                          </div>
                          {currentLanguage === lang.language_code && <Check size={16} />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="w-px h-6 bg-gray-300"></div>

            {/* Contact icons */}
            <div className={`flex items-center ${isRTL() ? 'space-x-reverse' : ''} space-x-2`}>
            {restaurantProfile?.telephone && (
              <a
                href={`tel:${restaurantProfile?.telephone}`}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title={`Appeler ${restaurantProfile?.telephone}`}
              >
                <Phone size={20} />
              </a>
            )}
            
            {restaurantProfile?.whatsapp && (
              <a
                href={formatWhatsAppLink(restaurantProfile?.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                title={`WhatsApp ${restaurantProfile?.whatsapp}`}
              >
                <MessageCircle size={20} />
              </a>
            )}
            
            {restaurantProfile?.instagram && (
              <a
                href={restaurantProfile?.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200"
                title="Suivez-nous sur Instagram"
              >
                <Instagram size={20} />
              </a>
            )}
            
            {restaurantProfile?.facebook && (
              <a
                href={restaurantProfile?.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Suivez-nous sur Facebook"
              >
                <Facebook size={20} />
              </a>
            )}
            
            {restaurantProfile?.tiktok && (
              <a
                href={restaurantProfile?.tiktok}
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

          {/* Mobile: Reservation button, Language selector, and Hamburger menu */}
          <div className={`lg:hidden flex items-center ${isRTL() ? 'space-x-reverse' : ''} space-x-2`}>
            {/* Reservation button - highlighted */}
            <button
              onClick={() => setShowReservationForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg shadow-sm hover:bg-orange-700 transition-all"
              style={{ backgroundColor: menu.couleur_primaire }}
            >
              <Calendar size={18} />
              <span className="text-sm font-medium">Réserver</span>
            </button>

            {availableLanguages.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLanguageSelector(!showLanguageSelector);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <span className="text-xl">{LANGUAGES[currentLanguage]?.flag || '🌐'}</span>
                  <ChevronDown size={16} />
                </button>
                {showLanguageSelector && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    <button
                      onClick={() => {
                        setCurrentLanguage(menu.default_language || 'fr');
                        setShowLanguageSelector(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${currentLanguage === menu.default_language ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{LANGUAGES[menu.default_language || 'fr']?.flag}</span>
                          <span className="text-sm">{LANGUAGES[menu.default_language || 'fr']?.name}</span>
                        </div>
                        {currentLanguage === menu.default_language && <Check size={16} />}
                      </div>
                    </button>
                    {availableLanguages.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => {
                          setCurrentLanguage(lang.language_code);
                          setShowLanguageSelector(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${currentLanguage === lang.language_code ? 'bg-orange-50 text-orange-700' : 'text-gray-700'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{LANGUAGES[lang.language_code]?.flag || '🌐'}</span>
                            <span className="text-sm">{LANGUAGES[lang.language_code]?.name || lang.language_code}</span>
                          </div>
                          {currentLanguage === lang.language_code && <Check size={16} />}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile/Tablet: Hamburger menu button - only show if there are contact items */}
            {(restaurantProfile?.telephone || restaurantProfile?.whatsapp || restaurantProfile?.instagram || restaurantProfile?.facebook || restaurantProfile?.tiktok) && (
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
          
          {/* Menu déroulant */}
          {isMenuOpen && (restaurantProfile?.telephone || restaurantProfile?.whatsapp || restaurantProfile?.instagram || restaurantProfile?.facebook || restaurantProfile?.tiktok) && (
            <div className="absolute top-full left-0 right-0 w-full bg-white shadow-xl border-b border-gray-200 z-50 md:left-auto md:right-0 md:w-80 md:border-l">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-lg">Nous contacter</h3>
              </div>
              
              <div className="py-1">
                {/* Téléphone */}
                {restaurantProfile?.telephone && (
                  <a
                    href={`tel:${restaurantProfile?.telephone}`}
                    className={`flex items-center ${isRTL() ? 'space-x-reverse' : ''} space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50`}
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Téléphone</div>
                      <div className="text-sm text-gray-600">{restaurantProfile?.telephone}</div>
                    </div>
                  </a>
                )}
                
                {/* WhatsApp */}
                {restaurantProfile?.whatsapp && (
                  <a
                    href={formatWhatsAppLink(restaurantProfile?.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center ${isRTL() ? 'space-x-reverse' : ''} space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50`}
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle size={18} className="text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">WhatsApp</div>
                      <div className="text-sm text-gray-600">{restaurantProfile?.whatsapp}</div>
                    </div>
                  </a>
                )}
                
                {/* Instagram */}
                {restaurantProfile?.instagram && (
                  <a
                    href={restaurantProfile?.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center ${isRTL() ? 'space-x-reverse' : ''} space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50`}
                  >
                    <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Instagram size={18} className="text-pink-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Instagram</div>
                      <div className="text-sm text-gray-600">@{restaurantProfile?.instagram.split('/').pop()}</div>
                    </div>
                  </a>
                )}
                
                {/* Facebook */}
                {restaurantProfile?.facebook && (
                  <a
                    href={restaurantProfile?.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center ${isRTL() ? 'space-x-reverse' : ''} space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50`}
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Facebook size={18} className="text-blue-700" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Facebook</div>
                      <div className="text-sm text-gray-600">Voir la page</div>
                    </div>
                  </a>
                )}
                
                {/* TikTok */}
                {restaurantProfile?.tiktok && (
                  <a
                    href={restaurantProfile?.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center ${isRTL() ? 'space-x-reverse' : ''} space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50`}
                  >
                    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">T</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">TikTok</div>
                      <div className="text-sm text-gray-600">@{restaurantProfile?.tiktok.split('/').pop()?.replace('@', '')}</div>
                    </div>
                  </a>
                )}
                
                {/* Message si aucun contact configuré */}
                {!restaurantProfile?.telephone && !restaurantProfile?.whatsapp && !restaurantProfile?.instagram && !restaurantProfile?.facebook && !restaurantProfile?.tiktok && (
                  <div className="px-4 py-8 text-gray-500 text-center">
                    Aucune information de contact configurée
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Header avec bannière - only show if banner exists */}
      {menu.banniere_url && (
        <div 
          className="h-64 md:h-56 lg:hidden relative mt-16 overflow-hidden"
          style={{ backgroundColor: menu.couleur_primaire }}
        >
          <img 
            src={menu.banniere_url} 
            alt="Bannière du restaurant"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="px-4 lg:pt-20">
        {/* Navigation des catégories - Style Glovo */}
        {categories.length > 0 && (
          <div className="sticky top-16 bg-white z-20 -mx-4 px-4 py-3 mb-8 border-b border-gray-200 shadow-sm lg:hidden">
            <div
              ref={navRef}
              className={`flex ${isRTL() ? 'space-x-reverse' : ''} space-x-8 overflow-x-auto scrollbar-hide items-center`}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {categories.map((category) => (
                <button
                  key={category.id}
                  ref={(el) => categoryButtonRefs.current[category.id] = el}
                  onClick={() => scrollToCategory(category.id)}
                  className={`whitespace-nowrap font-semibold text-base py-2 border-b-3 transition-all duration-300 ${
                    activeCategory === category.id
                      ? 'border-current'
                      : 'border-transparent text-gray-600'
                  }`}
                  style={{
                    color: activeCategory === category.id ? menu.couleur_primaire : undefined,
                    borderColor: activeCategory === category.id ? menu.couleur_primaire : undefined
                  }}
                >
                  {currentLanguage !== (menu.default_language || 'fr') && categoryTranslations[category.id]
                    ? categoryTranslations[category.id].nom
                    : category.nom}
                </button>
              ))}
            </div>
          </div>
        )}


        {/* Bouton Desktop Réserver une table */}
        <div className="hidden lg:block mb-8">
          <div className="text-center">
            <button
              onClick={() => setShowReservationForm(true)}
              className={`bg-orange-600 text-white px-8 py-4 rounded-xl shadow-lg hover:bg-orange-700 transition-colors flex items-center ${isRTL() ? 'space-x-reverse' : ''} space-x-3 font-medium text-lg mx-auto`}
              style={{ backgroundColor: menu.couleur_primaire }}
            >
              <Calendar size={24} />
              <span>Réserver une table</span>
            </button>
          </div>
        </div>

        {/* Contenu du menu */}
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 lg:items-start">
          {/* Desktop Sidebar Navigation - Hidden on mobile */}
          {categories.length > 0 && (
            <div className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div 
                  className="px-6 py-4 text-white text-center font-bold text-lg"
                  style={{ backgroundColor: menu.couleur_primaire }}
                >
                  Notre Menu
                </div>
                <nav className="py-2">
                  {categories.map((category) => {
                    const items = menuItems[category.id] || [];
                    if (items.length === 0) return null;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => scrollToCategory(category.id)}
                        className={`w-full text-left px-6 py-4 transition-all duration-200 border-l-4 ${
                          activeCategory === category.id
                            ? 'bg-gray-50 border-current font-semibold'
                            : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                        }`}
                        style={{
                          color: activeCategory === category.id ? menu.couleur_primaire : menu.couleur_texte,
                          borderColor: activeCategory === category.id ? menu.couleur_primaire : undefined
                        }}
                      >
                        <div className="font-medium text-base">{category.nom}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {items.length} plat{items.length > 1 ? 's' : ''}
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="lg:min-h-screen">
            {categories.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 mb-8 mx-4 lg:mx-0">
                <div 
                  className="text-center py-16 border-2 border-dashed rounded-xl"
                  style={{ borderColor: menu.couleur_primaire + '40' }}
                >
                  <h2 
                    className="text-2xl font-bold mb-4"
                    style={{ color: menu.couleur_secondaire }}
                  >
                    Menu en cours de création
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Le propriétaire de ce restaurant configure actuellement son menu.
                    <br />
                    Revenez bientôt pour découvrir nos délicieux plats !
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8 lg:space-y-12 mb-8">
                {categories.map((category) => {
                  const items = menuItems[category.id] || [];
                  if (items.length === 0) return null;

                  return (
                    <div 
                      key={category.id}
                      ref={(el) => categoryRefs.current[category.id] = el}
                      className="bg-white shadow-lg lg:shadow-xl lg:rounded-2xl lg:overflow-hidden mx-4 lg:mx-0"
                    >
                      {/* Category Header */}
                      <div 
                        className="px-6 py-6 lg:px-8 lg:py-8 border-b border-gray-100 lg:text-center"
                        style={{ backgroundColor: menu.couleur_primaire + '10' }}
                      >
                        <h2 
                          className="text-2xl lg:text-3xl font-bold"
                          style={{ color: menu.couleur_secondaire }}
                        >
                          {currentLanguage !== (menu.default_language || 'fr') && categoryTranslations[category.id]
                    ? categoryTranslations[category.id].nom
                    : category.nom}
                        </h2>
                        {category.description && (
                          <p className="text-base lg:text-lg text-gray-600 mt-2">{category.description}</p>
                        )}
                        <div className="hidden lg:block w-16 h-1 bg-current mx-auto mt-4 rounded-full" 
                             style={{ backgroundColor: menu.couleur_primaire }} />
                      </div>

                      {/* Menu Items - Mobile: List, Desktop: Grid */}
                      <div className="lg:p-8 lg:grid lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 lg:gap-6">
                        {/* Mobile Layout - List */}
                        <div className="lg:hidden">
                          {items.map((item) => (
                            <div key={item.id} className="px-4 py-6 border-b border-gray-100 last:border-b-0">
                              <div className={`flex items-start ${isRTL() ? 'space-x-reverse' : ''} space-x-4`}>
                                {/* Image - only show if exists */}
                                {item.image_url && (
                                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                    <img
                                      src={item.image_url}
                                      alt={item.nom}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className={`flex-1 ${isRTL() ? 'pl-2' : 'pr-2'}`}>
                                      <h3 
                                        className="font-bold text-lg leading-tight"
                                        style={{ color: menu.couleur_secondaire }}
                                      >
                                        {currentLanguage !== (menu.default_language || 'fr') && itemTranslations[item.id]
                                          ? itemTranslations[item.id].nom
                                          : item.nom}
                                      </h3>
                                      
                                      {/* Icônes diététiques */}
                                      <div className={`flex items-center ${isRTL() ? 'space-x-reverse' : ''} space-x-1 mt-1`}>
                                        {item.vegetarien && (
                                          <span className="bg-green-100 text-green-700 p-1 rounded-full" title="Végétarien">
                                            <Leaf className="w-3 h-3" />
                                          </span>
                                        )}
                                        {item.vegan && (
                                          <span className="bg-green-200 text-green-800 p-1 rounded-full" title="Vegan">
                                            <Leaf className="w-3 h-3" />
                                          </span>
                                        )}
                                        {item.sans_gluten && (
                                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs font-medium">
                                            SG
                                          </span>
                                        )}
                                        {item.epice && (
                                          <span className="bg-red-100 text-red-700 p-1 rounded-full" title="Épicé">
                                            <Flame className="w-3 h-3" />
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <span
                                      className={`text-xl font-bold flex-shrink-0 ${isRTL() ? 'mr-2' : 'ml-2'}`}
                                      style={{ color: menu.couleur_primaire }}
                                    >
                                      {item.prix.toFixed(2)} €
                                    </span>
                                  </div>

                                  {(currentLanguage !== (menu.default_language || 'fr') && itemTranslations[item.id]
                                    ? itemTranslations[item.id].description
                                    : item.description) && (
                                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                      {currentLanguage !== (menu.default_language || 'fr') && itemTranslations[item.id]
                                        ? itemTranslations[item.id].description
                                        : item.description}
                                    </p>
                                  )}

                                  {item.allergenes.length > 0 && (
                                    <p className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                      Allergènes: {item.allergenes.join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Layout - Cards */}
                        {items.map((item) => (
                          <div key={item.id} className="hidden lg:block">
                            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
                              {/* Card Image - only show if exists */}
                              {item.image_url && (
                                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                                  <img
                                    src={item.image_url}
                                    alt={item.nom}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />

                                  {/* Dietary Icons Overlay */}
                                  <div className={`absolute top-3 ${isRTL() ? 'right-3' : 'left-3'} flex ${isRTL() ? 'space-x-reverse' : ''} space-x-1`}>
                                    {item.vegetarien && (
                                      <span className="bg-white/90 backdrop-blur-sm text-green-600 p-1.5 rounded-full shadow-sm" title="Végétarien">
                                        <Leaf className="w-4 h-4" />
                                      </span>
                                    )}
                                    {item.vegan && (
                                      <span className="bg-white/90 backdrop-blur-sm text-green-700 p-1.5 rounded-full shadow-sm" title="Vegan">
                                        <Leaf className="w-4 h-4" />
                                      </span>
                                    )}
                                    {item.sans_gluten && (
                                      <span className="bg-white/90 backdrop-blur-sm text-blue-600 px-2 py-1 rounded-full text-xs font-bold shadow-sm">
                                        SG
                                      </span>
                                    )}
                                    {item.epice && (
                                      <span className="bg-white/90 backdrop-blur-sm text-red-600 p-1.5 rounded-full shadow-sm" title="Épicé">
                                        <Flame className="w-4 h-4" />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Card Content */}
                              <div className="p-6 flex-1 flex flex-col">
                                {/* Dietary Icons - only show when no image */}
                                {!item.image_url && (item.vegetarien || item.vegan || item.sans_gluten || item.epice) && (
                                  <div className={`flex ${isRTL() ? 'space-x-reverse' : ''} space-x-1 mb-3`}>
                                    {item.vegetarien && (
                                      <span className="bg-green-100 text-green-600 p-1.5 rounded-full" title="Végétarien">
                                        <Leaf className="w-4 h-4" />
                                      </span>
                                    )}
                                    {item.vegan && (
                                      <span className="bg-green-200 text-green-700 p-1.5 rounded-full" title="Vegan">
                                        <Leaf className="w-4 h-4" />
                                      </span>
                                    )}
                                    {item.sans_gluten && (
                                      <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-bold">
                                        SG
                                      </span>
                                    )}
                                    {item.epice && (
                                      <span className="bg-red-100 text-red-600 p-1.5 rounded-full" title="Épicé">
                                        <Flame className="w-4 h-4" />
                                      </span>
                                    )}
                                  </div>
                                )}

                                <h3
                                  className="text-xl font-bold mb-2 group-hover:text-current transition-colors"
                                  style={{ color: menu.couleur_secondaire }}
                                >
                                  {currentLanguage !== (menu.default_language || 'fr') && itemTranslations[item.id]
                                    ? itemTranslations[item.id].nom
                                    : item.nom}
                                </h3>

                                {(currentLanguage !== (menu.default_language || 'fr') && itemTranslations[item.id]
                                  ? itemTranslations[item.id].description
                                  : item.description) && (
                                  <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">
                                    {currentLanguage !== (menu.default_language || 'fr') && itemTranslations[item.id]
                                      ? itemTranslations[item.id].description
                                      : item.description}
                                  </p>
                                )}
                                
                                {item.allergenes.length > 0 && (
                                  <p className="text-xs text-gray-500 mb-4 bg-gray-50 px-3 py-1 rounded-lg">
                                    Allergènes: {item.allergenes.join(', ')}
                                  </p>
                                )}

                                {/* Price */}
                                <div className="flex items-center pt-4 border-t border-gray-100">
                                  <span
                                    className="text-2xl font-bold"
                                    style={{ color: menu.couleur_primaire }}
                                  >
                                    {item.prix.toFixed(2)} €
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {(menu.afficher_powered_by || menu.lien_cloudmenu) && (
          <footer className="text-center py-8 border-t border-gray-200 bg-gray-50 mx-4 lg:mx-0 lg:rounded-t-2xl">
            {menu.afficher_powered_by && (
              <p className="text-base text-gray-500 mb-3">
                Propulsé par CloudMenu
              </p>
            )}
            {menu.lien_cloudmenu && (
              <a 
                href="https://cloudmenu.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-base hover:underline"
                style={{ color: menu.couleur_primaire }}
              >
                Créer mon menu gratuitement avec CloudMenu
              </a>
            )}
          </footer>
        )}
      </div>

      {/* Modal de réservation */}
      {showReservationForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Réserver une table</h2>
                <button
                  onClick={() => setShowReservationForm(false)}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Message */}
            {reservationMessage && (
              <div className={`mx-6 mt-4 p-4 rounded-lg flex items-start space-x-2 ${
                reservationMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {reservationMessage.type === 'success' ? (
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <X className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-sm">{reservationMessage.text}</span>
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleReservationSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={reservationData.customer_name}
                  onChange={(e) => setReservationData(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white"
                  placeholder="Votre nom"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  value={reservationData.customer_phone}
                  onChange={(e) => setReservationData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white"
                  placeholder="06 12 34 56 78"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={reservationData.reservation_date}
                  onChange={(e) => setReservationData(prev => ({ ...prev, reservation_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white text-base [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-date-and-time-value]:text-left"
                  style={{ colorScheme: 'light' }}
                  min={getTomorrowDate()}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure *
                </label>
                <input
                  type="time"
                  value={reservationData.reservation_time}
                  onChange={(e) => setReservationData(prev => ({ ...prev, reservation_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white text-base [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-date-and-time-value]:text-left"
                  style={{ colorScheme: 'light' }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de personnes *
                </label>
                <select
                  value={reservationData.party_size}
                  onChange={(e) => setReservationData(prev => ({ ...prev, party_size: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white"
                  required
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <option key={num} value={num}>
                      {num} personne{num > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Demandes spéciales (optionnel)
                </label>
                <textarea
                  value={reservationData.special_requests}
                  onChange={(e) => setReservationData(prev => ({ ...prev, special_requests: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white resize-none"
                  rows={3}
                  placeholder="Allergies, préférences de table, occasion spéciale..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReservationForm(false)}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={reservationLoading}
                  className={`flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center ${isRTL() ? 'space-x-reverse' : ''} space-x-2`}
                  style={{ backgroundColor: menu.couleur_primaire }}
                >
                  {reservationLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      <span>Réserver</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPreview;