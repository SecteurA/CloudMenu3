import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'cloudmenu-auth-token',
    storage: window.localStorage,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Types pour les profils restaurant
export interface RestaurantProfile {
  id: string;
  user_id: string;
  restaurant_name: string;
  slug: string;
  description: string;
  banner_url: string;
  logo_url: string;
  hero_background_color: string;
  primary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  telephone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  address: string;
  hours: string;
  google_business_url: string;
  location: string;
  show_footer_branding: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantProfileInsert {
  user_id: string;
  restaurant_name: string;
  slug: string;
  description?: string;
  banner_url?: string;
  logo_url?: string;
  hero_background_color?: string;
  primary_color?: string;
  accent_color?: string;
  text_color?: string;
  background_color?: string;
  telephone?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  address?: string;
  hours?: string;
  google_business_url?: string;
  location?: string;
  show_footer_branding?: boolean;
}

export interface RestaurantProfileUpdate {
  restaurant_name?: string;
  slug?: string;
  description?: string;
  banner_url?: string;
  logo_url?: string;
  hero_background_color?: string;
  primary_color?: string;
  accent_color?: string;
  text_color?: string;
  background_color?: string;
  telephone?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  address?: string;
  hours?: string;
  google_business_url?: string;
  location?: string;
  show_footer_branding?: boolean;
}

// Types pour les menus
export interface Menu {
  id: string;
  user_id: string;
  nom: string;
  menu_name: string;
  description: string;
  slug: string;
  banniere_url: string;
  couleur_primaire: string;
  couleur_secondaire: string;
  couleur_texte: string;
  couleur_fond: string;
  afficher_powered_by: boolean;
  lien_cloudmenu: boolean;
  actif: boolean;
  status: 'draft' | 'published';
  language: string;
  created_at: string;
  updated_at: string;
  telephone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  currency_symbol: string;
}

export interface MenuInsert {
  user_id: string;
  nom: string;
  menu_name?: string;
  description?: string;
  slug: string;
  banniere_url?: string;
  couleur_primaire?: string;
  couleur_secondaire?: string;
  couleur_texte?: string;
  couleur_fond?: string;
  afficher_powered_by?: boolean;
  lien_cloudmenu?: boolean;
  actif?: boolean;
  status?: 'draft' | 'published';
  language?: string;
  telephone?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  currency_symbol?: string;
}

export interface MenuUpdate {
  nom?: string;
  menu_name?: string;
  description?: string;
  slug?: string;
  couleur_primaire?: string;
  couleur_secondaire?: string;
  couleur_texte?: string;
  couleur_fond?: string;
  afficher_powered_by?: boolean;
  lien_cloudmenu?: boolean;
  actif?: boolean;
  status?: 'draft' | 'published';
  language?: string;
  telephone?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  currency_symbol?: string;
}

// Types pour les catégories
export interface Category {
  id: string;
  menu_id: string;
  nom: string;
  description: string;
  ordre: number;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryInsert {
  menu_id: string;
  nom: string;
  description?: string;
  ordre?: number;
  actif?: boolean;
}

export interface CategoryUpdate {
  nom?: string;
  description?: string;
  ordre?: number;
  actif?: boolean;
}

// Types pour les éléments de menu
export interface MenuItem {
  id: string;
  category_id: string;
  nom: string;
  description: string;
  prix: number;
  image_url: string;
  allergenes: string[];
  vegetarien: boolean;
  vegan: boolean;
  sans_gluten: boolean;
  epice: boolean;
  ordre: number;
  disponible: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItemInsert {
  category_id: string;
  nom: string;
  description?: string;
  prix: number;
  image_url?: string;
  allergenes?: string[];
  vegetarien?: boolean;
  vegan?: boolean;
  sans_gluten?: boolean;
  epice?: boolean;
  ordre?: number;
  disponible?: boolean;
}

export interface MenuItemUpdate {
  nom?: string;
  description?: string;
  prix?: number;
  image_url?: string;
  allergenes?: string[];
  vegetarien?: boolean;
  vegan?: boolean;
  sans_gluten?: boolean;
  epice?: boolean;
  ordre?: number;
  disponible?: boolean;
}

// Fonction pour générer un slug unique
export const generateSlug = (nom: string): string => {
  return nom
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Supprimer les caractères spéciaux
    .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
    .replace(/-+/g, '-') // Supprimer les tirets multiples
    .trim();
};

// Upload d'une image vers le bucket cloudmenu
export const uploadImage = async (
  file: File, 
  folder: 'logos' | 'bannieres' | 'menu-items'
): Promise<{ url: string; error?: string }> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('cloudmenu')
      .upload(fileName, file);

    if (error) {
      return { url: '', error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from('cloudmenu')
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl };
  } catch (error) {
    return { url: '', error: 'Erreur lors de l\'upload' };
  }
};

// Vérifier la disponibilité d'un slug
export const checkSlugAvailability = async (slug: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('menus')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Erreur lors de la vérification du slug:', error);
      return false; // En cas d'erreur, considérer comme non disponible
    }

    return !data; // Disponible si aucune entrée trouvée
  } catch (error) {
    console.error('Erreur lors de la vérification du slug:', error);
    return false;
  }
};

// Supprimer une image du bucket
export const deleteImage = async (url: string): Promise<boolean> => {
  try {
    const path = url.split('/cloudmenu/')[1];
    if (!path) return false;
    
    const { error } = await supabase.storage
      .from('cloudmenu')
      .remove([path]);

    return !error;
  } catch (error) {
    return false;
  }
};

// Types pour les analytics
export interface MenuAnalytics {
  id: string;
  menu_id: string;
  visit_type: 'qr_scan' | 'direct_link' | 'share' | 'gmb';
  visitor_ip_hash: string | null;
  user_agent: string | null;
  referrer: string | null;
  visited_at: string;
}

export interface MenuAnalyticsInsert {
  menu_id: string;
  visit_type: 'qr_scan' | 'direct_link' | 'share' | 'gmb';
  visitor_ip_hash?: string;
  user_agent?: string;
  referrer?: string;
}

// Fonction pour hasher une IP (pour la confidentialité)
export const hashIP = async (ip: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'cloudmenu-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Enregistrer une visite du menu
export const trackMenuVisit = async (menuId: string, visitType: 'qr_scan' | 'direct_link' | 'share' | 'gmb' = 'direct_link') => {
  try {
    // Don't track visits when tab is hidden
    if (document.hidden) return;
    
    const analyticsData: MenuAnalyticsInsert = {
      menu_id: menuId,
      visit_type: visitType,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null
    };

    const { error } = await supabase
      .from('menu_analytics')
      .insert([analyticsData]);

    if (error) {
      console.error('Erreur lors de l\'enregistrement de la visite:', error);
    }
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la visite:', error);
  }
};
