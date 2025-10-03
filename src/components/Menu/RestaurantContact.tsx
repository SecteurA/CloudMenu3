import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, Menu } from '../../lib/supabase';
import { Loader2, AlertCircle, Phone, MessageCircle, Instagram, Facebook, Mail, MapPin, Clock, ArrowLeft, ExternalLink } from 'lucide-react';

const RestaurantContact = () => {
  const { slug } = useParams<{ slug: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMenu();
  }, [slug]);

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
        setError('Restaurant non trouvé');
        return;
      }

      setMenu(data);
    } catch (error) {
      setError('Erreur lors du chargement du menu');
    } finally {
      setLoading(false);
    }
  };

  const formatWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('33') ? cleanPhone : `33${cleanPhone.substring(1)}`;
    return `https://wa.me/${formattedPhone}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant non trouvé</h1>
          <p className="text-gray-600">{error || 'Ce restaurant n\'existe pas ou n\'est pas disponible.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen py-12"
      style={{ 
        backgroundColor: menu.couleur_fond,
        color: menu.couleur_texte 
      }}
    >
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Link 
          to={`/m/${menu.slug}`}
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-8"
        >
          <ArrowLeft size={20} />
          <span>Retour à l'accueil</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl">🍽️</span>
          </div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: menu.couleur_secondaire }}
          >
            Contact
          </h1>
          <h2 className="text-xl text-gray-600">{menu.nom}</h2>
          {menu.description && (
            <p className="text-gray-600 mt-2">{menu.description}</p>
          )}
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phone Contact */}
          {menu.telephone && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <Phone size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Téléphone</h3>
                  <p className="text-gray-600">Appelez-nous directement</p>
                </div>
              </div>
              <a
                href={`tel:${menu.telephone}`}
                className="block w-full text-center bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {menu.telephone}
              </a>
            </div>
          )}

          {/* WhatsApp Contact */}
          {menu.whatsapp && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle size={24} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">WhatsApp</h3>
                  <p className="text-gray-600">Messagerie instantanée</p>
                </div>
              </div>
              <a
                href={formatWhatsAppLink(menu.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <span>{menu.whatsapp}</span>
                <ExternalLink size={16} />
              </a>
            </div>
          )}

          {/* Reservation Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: menu.couleur_primaire + '20' }}
              >
                <Phone size={24} style={{ color: menu.couleur_primaire }} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Réservation</h3>
                <p className="text-gray-600">Réservez en ligne</p>
              </div>
            </div>
            <Link
              to={`/m/${menu.slug}/reservation`}
              className="block w-full text-center text-white py-4 px-6 rounded-lg transition-colors font-medium"
              style={{ backgroundColor: menu.couleur_primaire }}
            >
              Réserver une table
            </Link>
          </div>

          {/* Menu Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: menu.couleur_primaire + '20' }}
              >
                <Phone size={24} style={{ color: menu.couleur_primaire }} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Notre Menu</h3>
                <p className="text-gray-600">Découvrez nos plats</p>
              </div>
            </div>
            <Link
              to={`/m/${menu.slug}/menu`}
              className="block w-full text-center text-white py-4 px-6 rounded-lg transition-colors font-medium"
              style={{ backgroundColor: menu.couleur_primaire }}
            >
              Voir le menu
            </Link>
          </div>
        </div>

        {/* Social Media Section */}
        {(menu.instagram || menu.facebook || menu.tiktok) && (
          <div className="mt-12">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-2xl font-bold text-center mb-8" style={{ color: menu.couleur_secondaire }}>
                Suivez-nous sur les réseaux sociaux
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {menu.instagram && (
                  <a
                    href={menu.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-105"
                  >
                    <Instagram size={32} className="mb-4" />
                    <span className="font-medium">Instagram</span>
                    <span className="text-sm opacity-90">@{menu.instagram.split('/').pop()}</span>
                  </a>
                )}
                
                {menu.facebook && (
                  <a
                    href={menu.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 hover:scale-105"
                  >
                    <Facebook size={32} className="mb-4" />
                    <span className="font-medium">Facebook</span>
                    <span className="text-sm opacity-90">Voir la page</span>
                  </a>
                )}
                
                {menu.tiktok && (
                  <a
                    href={menu.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center p-6 bg-black text-white rounded-xl hover:bg-gray-800 transition-all duration-300 hover:scale-105"
                  >
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mb-4">
                      <span className="text-black font-bold">T</span>
                    </div>
                    <span className="font-medium">TikTok</span>
                    <span className="text-sm opacity-90">@{menu.tiktok.split('/').pop()?.replace('@', '')}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Information Note */}
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-2xl">
          <p className="text-blue-700 text-center">
            ℹ️ <strong>Besoin d'aide ?</strong> N'hésitez pas à nous contacter pour toute question 
            ou demande spéciale. Nous sommes là pour vous aider !
          </p>
        </div>
      </div>
    </div>
  );
};

export default RestaurantContact;