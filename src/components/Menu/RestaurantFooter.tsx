import React from 'react';
import { Phone, MapPin, Clock, Instagram, Facebook, Music, MessageCircle } from 'lucide-react';
import { RestaurantProfile } from '../../lib/supabase';
import { getTranslation } from '../../hooks/useInterfaceTranslations';

interface RestaurantFooterProps {
  restaurant: RestaurantProfile;
  selectedLanguage: string;
  translations: Record<string, string>;
}

export default function RestaurantFooter({ restaurant, selectedLanguage, translations }: RestaurantFooterProps) {
  const formatWhatsAppLink = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}`;
  };

  const getEmbeddableMapUrl = (url: string): string | null => {
    if (!url) return null;

    // If it's already an embed URL, return it
    if (url.includes('/embed')) {
      return url;
    }

    // Extract place ID or coordinates from various Google Maps URL formats
    try {
      // Format: https://maps.google.com/?q=lat,lng
      const coordMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordMatch) {
        return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d!2d${coordMatch[2]}!3d${coordMatch[1]}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1`;
      }

      // Format: https://www.google.com/maps/place/...
      const placeMatch = url.match(/place\/([^/]+)/);
      if (placeMatch) {
        const placeName = encodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${placeName}`;
      }

      // Format: https://goo.gl/maps/... or https://maps.app.goo.gl/...
      // These shortened URLs need to be converted - we'll open them in a new window instead
      if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
        // Cannot embed shortened URLs - return null to show link instead
        return null;
      }

      // Default: try to extract place name from URL
      const urlObj = new URL(url);
      const searchParams = new URLSearchParams(urlObj.search);
      const query = searchParams.get('q');
      if (query) {
        return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(query)}`;
      }

      return null;
    } catch (error) {
      console.error('Error parsing map URL:', error);
      return null;
    }
  };

  const contact = getTranslation(translations, 'contact', 'Contact');
  const followUs = getTranslation(translations, 'follow_us', 'Suivez-nous');
  const poweredBy = getTranslation(translations, 'powered_by', 'Propulsé par');
  const location = getTranslation(translations, 'our_location', 'Notre emplacement');
  const rights = getTranslation(translations, 'all_rights_reserved', 'Tous droits réservés.');

  const embeddableMapUrl = restaurant.location ? getEmbeddableMapUrl(restaurant.location) : null;

  const hasContactInfo = restaurant.telephone || restaurant.whatsapp || restaurant.address || restaurant.hours;
  const hasSocialMedia = restaurant.instagram || restaurant.facebook || restaurant.tiktok;

  return (
    <footer className="bg-gray-900 text-white mt-12">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hasContactInfo && (
            <div>
              <h3 className="text-lg font-bold text-orange-500 mb-4">{contact}</h3>
              <div className="space-y-3">
                {restaurant.telephone && (
                  <a
                    href={`tel:${restaurant.telephone}`}
                    className="flex items-start space-x-3 text-gray-300 hover:text-orange-500 transition-colors"
                  >
                    <Phone size={18} className="flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{restaurant.telephone}</span>
                  </a>
                )}
                {restaurant.whatsapp && (
                  <a
                    href={formatWhatsAppLink(restaurant.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start space-x-3 text-gray-300 hover:text-orange-500 transition-colors"
                  >
                    <MessageCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{restaurant.whatsapp}</span>
                  </a>
                )}
                {restaurant.address && (
                  <div className="flex items-start space-x-3 text-gray-300">
                    <MapPin size={18} className="flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{restaurant.address}</span>
                  </div>
                )}
                {restaurant.hours && (
                  <div className="flex items-start space-x-3 text-gray-300">
                    <Clock size={18} className="flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{restaurant.hours}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {hasSocialMedia && (
            <div>
              <h3 className="text-lg font-bold text-orange-500 mb-4">{followUs}</h3>
              <div className="space-y-3">
                {restaurant.instagram && (
                  <a
                    href={restaurant.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 text-gray-300 hover:text-orange-500 transition-colors"
                  >
                    <Instagram size={18} />
                    <span className="text-sm">Instagram</span>
                  </a>
                )}
                {restaurant.facebook && (
                  <a
                    href={restaurant.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 text-gray-300 hover:text-orange-500 transition-colors"
                  >
                    <Facebook size={18} />
                    <span className="text-sm">Facebook</span>
                  </a>
                )}
                {restaurant.tiktok && (
                  <a
                    href={restaurant.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 text-gray-300 hover:text-orange-500 transition-colors"
                  >
                    <Music size={18} />
                    <span className="text-sm">TikTok</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {restaurant.location && (
            <div className={`${!hasSocialMedia && hasContactInfo ? 'md:col-span-2 lg:col-span-1' : ''}`}>
              <h3 className="text-lg font-bold text-orange-500 mb-4">{location}</h3>
              {embeddableMapUrl ? (
                <div className="aspect-video w-full rounded-lg overflow-hidden">
                  <iframe
                    src={embeddableMapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <a
                  href={restaurant.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full aspect-video bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all font-medium"
                >
                  <MapPin size={24} />
                  <span>Voir sur Google Maps</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} {restaurant.restaurant_name}. {rights}
            </p>
            {restaurant.show_footer_branding && (
              <a
                href="https://cloudmenu.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-orange-500 transition-colors"
              >
                {poweredBy}{' '}
                <span className="font-semibold text-orange-500">CloudMenu</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
