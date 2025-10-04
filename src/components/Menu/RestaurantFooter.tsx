import React from 'react';
import { Phone, MapPin, Clock, Instagram, Facebook, Music, MessageCircle } from 'lucide-react';
import { RestaurantProfile } from '../../lib/supabase';

interface RestaurantFooterProps {
  restaurant: RestaurantProfile;
  selectedLanguage: string;
}

export default function RestaurantFooter({ restaurant, selectedLanguage }: RestaurantFooterProps) {
  const getTranslations = (lang: string) => {
    const translations: Record<string, { contact: string; followUs: string; poweredBy: string }> = {
      fr: {
        contact: 'Contact',
        followUs: 'Suivez-nous',
        poweredBy: 'Propulsé par'
      },
      en: {
        contact: 'Contact',
        followUs: 'Follow us',
        poweredBy: 'Powered by'
      },
      es: {
        contact: 'Contacto',
        followUs: 'Síguenos',
        poweredBy: 'Desarrollado por'
      },
      de: {
        contact: 'Kontakt',
        followUs: 'Folge uns',
        poweredBy: 'Unterstützt von'
      },
      it: {
        contact: 'Contatti',
        followUs: 'Seguici',
        poweredBy: 'Offerto da'
      }
    };

    return translations[lang] || translations.fr;
  };

  const formatWhatsAppLink = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}`;
  };

  const { contact, followUs, poweredBy } = getTranslations(selectedLanguage);

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
              <h3 className="text-lg font-bold text-orange-500 mb-4">
                {selectedLanguage === 'fr' ? 'Notre emplacement' :
                 selectedLanguage === 'en' ? 'Our location' :
                 selectedLanguage === 'es' ? 'Nuestra ubicación' :
                 selectedLanguage === 'de' ? 'Unser Standort' :
                 selectedLanguage === 'it' ? 'La nostra posizione' : 'Notre emplacement'}
              </h3>
              <div className="aspect-video w-full rounded-lg overflow-hidden">
                <iframe
                  src={restaurant.location}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} {restaurant.restaurant_name}.
              {selectedLanguage === 'fr' ? ' Tous droits réservés.' :
               selectedLanguage === 'en' ? ' All rights reserved.' :
               selectedLanguage === 'es' ? ' Todos los derechos reservados.' :
               selectedLanguage === 'de' ? ' Alle Rechte vorbehalten.' :
               selectedLanguage === 'it' ? ' Tutti i diritti riservati.' : ' Tous droits réservés.'}
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
