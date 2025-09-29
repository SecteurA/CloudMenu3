import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, Menu, Category, MenuItem, trackMenuVisit } from '../../lib/supabase';
import { Loader2, AlertCircle, Leaf, Flame, Plus, Menu as MenuIcon, Phone, MessageCircle, Instagram, Facebook, X } from 'lucide-react';

const MenuPreview = () => {
  const { slug } = useParams<{ slug: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [visitTracked, setVisitTracked] = useState(false);
  
  // État pour le menu hamburger
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    loadMenu();
  }, [slug]);

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
    if (!slug) {
      setError('Slug manquant');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('slug', slug)
        .eq('actif', true)
        .maybeSingle();

      if (error) {
        setError('Erreur lors du chargement du menu');
        return;
      }

      if (!data) {
        setError('Menu non trouvé');
        return;
      }

      setMenu(data);
      await loadMenuContent(data.id);
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
    } catch (error) {
      console.error('Erreur lors du chargement du contenu:', error);
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

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: menu.couleur_fond,
        color: menu.couleur_texte 
      }}
    >
      {/* Navbar fixe */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-16 flex items-center justify-between px-4">
          {/* Logo texte (nom du restaurant) */}
          <h1 
            className="text-xl font-bold truncate"
            style={{ color: '#000000' }}
          >
            {menu.nom}
          </h1>
          
          {/* Desktop: Contact icons directly visible */}
          <div className="hidden lg:flex items-center space-x-4">
            {menu.telephone && (
              <a
                href={`tel:${menu.telephone}`}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title={`Appeler ${menu.telephone}`}
              >
                <Phone size={20} />
              </a>
            )}
            
            {menu.whatsapp && (
              <a
                href={formatWhatsAppLink(menu.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                title={`WhatsApp ${menu.whatsapp}`}
              >
                <MessageCircle size={20} />
              </a>
            )}
            
            {menu.instagram && (
              <a
                href={menu.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200"
                title="Suivez-nous sur Instagram"
              >
                <Instagram size={20} />
              </a>
            )}
            
            {menu.facebook && (
              <a
                href={menu.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Suivez-nous sur Facebook"
              >
                <Facebook size={20} />
              </a>
            )}
            
            {menu.tiktok && (
              <a
                href={menu.tiktok}
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
          
          {/* Mobile/Tablet: Hamburger menu button - only show if there are contact items */}
          {(menu.telephone || menu.whatsapp || menu.instagram || menu.facebook || menu.tiktok) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MenuIcon size={24} className="text-black" />
            </button>
          )}
          
          {/* Menu déroulant */}
          {isMenuOpen && (menu.telephone || menu.whatsapp || menu.instagram || menu.facebook || menu.tiktok) && (
            <div className="absolute top-full left-0 right-0 w-full bg-white shadow-xl border-b border-gray-200 z-50 md:left-auto md:right-0 md:w-80 md:border-l">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-lg">Nous contacter</h3>
              </div>
              
              <div className="py-1">
                {/* Téléphone */}
                {menu.telephone && (
                  <a
                    href={`tel:${menu.telephone}`}
                    className="flex items-center space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Téléphone</div>
                      <div className="text-sm text-gray-600">{menu.telephone}</div>
                    </div>
                  </a>
                )}
                
                {/* WhatsApp */}
                {menu.whatsapp && (
                  <a
                    href={formatWhatsAppLink(menu.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle size={18} className="text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">WhatsApp</div>
                      <div className="text-sm text-gray-600">{menu.whatsapp}</div>
                    </div>
                  </a>
                )}
                
                {/* Instagram */}
                {menu.instagram && (
                  <a
                    href={menu.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50"
                  >
                    <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Instagram size={18} className="text-pink-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Instagram</div>
                      <div className="text-sm text-gray-600">@{menu.instagram.split('/').pop()}</div>
                    </div>
                  </a>
                )}
                
                {/* Facebook */}
                {menu.facebook && (
                  <a
                    href={menu.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50"
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
                {menu.tiktok && (
                  <a
                    href={menu.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 border-b border-gray-50"
                  >
                    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">T</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">TikTok</div>
                      <div className="text-sm text-gray-600">@{menu.tiktok.split('/').pop()?.replace('@', '')}</div>
                    </div>
                  </a>
                )}
                
                {/* Message si aucun contact configuré */}
                {!menu.telephone && !menu.whatsapp && !menu.instagram && !menu.facebook && !menu.tiktok && (
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
              className="flex space-x-8 overflow-x-auto scrollbar-hide items-center"
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
                  {category.nom}
                </button>
              ))}
            </div>
          </div>
        )}

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
                          {category.nom}
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
                              <div className="flex items-start space-x-4">
                                {/* Image */}
                                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                  {item.image_url ? (
                                    <img 
                                      src={item.image_url} 
                                      alt={item.nom}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                        <span className="text-gray-400 text-xs">📷</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 pr-2">
                                      <h3 
                                        className="font-bold text-lg leading-tight"
                                        style={{ color: menu.couleur_secondaire }}
                                      >
                                        {item.nom}
                                      </h3>
                                      
                                      {/* Icônes diététiques */}
                                      <div className="flex items-center space-x-1 mt-1">
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
                                      className="text-xl font-bold flex-shrink-0 ml-2"
                                      style={{ color: menu.couleur_primaire }}
                                    >
                                      {item.prix.toFixed(2)} €
                                    </span>
                                  </div>

                                  {item.description && (
                                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">{item.description}</p>
                                  )}

                                  {item.allergenes.length > 0 && (
                                    <p className="text-xs text-gray-500 mb-3 bg-gray-50 px-2 py-1 rounded">
                                      Allergènes: {item.allergenes.join(', ')}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-end">
                                    <button 
                                      className="px-4 py-2 rounded-full text-white text-sm font-medium flex items-center space-x-1 shadow-sm"
                                      style={{ backgroundColor: menu.couleur_primaire }}
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span>Ajouter</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Layout - Cards */}
                        {items.map((item) => (
                          <div key={item.id} className="hidden lg:block">
                            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
                              {/* Card Image */}
                              <div className="aspect-video bg-gray-100 overflow-hidden relative">
                                {item.image_url ? (
                                  <img 
                                    src={item.image_url} 
                                    alt={item.nom}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                                      <span className="text-gray-400 text-2xl">🍽️</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Dietary Icons Overlay */}
                                <div className="absolute top-3 left-3 flex space-x-1">
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

                              {/* Card Content */}
                              <div className="p-6 flex-1 flex flex-col">
                                <h3 
                                  className="text-xl font-bold mb-2 group-hover:text-current transition-colors"
                                  style={{ color: menu.couleur_secondaire }}
                                >
                                  {item.nom}
                                </h3>
                                
                                {item.description && (
                                  <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">{item.description}</p>
                                )}
                                
                                {item.allergenes.length > 0 && (
                                  <p className="text-xs text-gray-500 mb-4 bg-gray-50 px-3 py-1 rounded-lg">
                                    Allergènes: {item.allergenes.join(', ')}
                                  </p>
                                )}

                                {/* Price and Add Button */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                  <span 
                                    className="text-2xl font-bold"
                                    style={{ color: menu.couleur_primaire }}
                                  >
                                    {item.prix.toFixed(2)} €
                                  </span>
                                  
                                  <button 
                                    className="px-6 py-2 rounded-full text-white font-medium hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
                                    style={{ 
                                      backgroundColor: menu.couleur_primaire,
                                    }}
                                  >
                                    Ajouter
                                  </button>
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
    </div>
  );
};

export default MenuPreview;