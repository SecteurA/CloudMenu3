import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, Menu } from '../../lib/supabase';
import { Loader2, AlertCircle, Calendar, Clock, Users, Phone, Mail, X, Check, ArrowLeft } from 'lucide-react';

const RestaurantReservation = () => {
  const { slug } = useParams<{ slug: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [reservationData, setReservationData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    party_size: 2,
    reservation_date: '',
    reservation_time: '',
    special_requests: ''
  });

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

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reservationData.customer_name.trim() || !reservationData.customer_phone.trim() || 
        !reservationData.reservation_date || !reservationData.reservation_time) {
      showMessage('error', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setReservationLoading(true);
    
    try {
      const { error } = await supabase
        .from('reservations')
        .insert([{
          menu_id: menu!.id,
          customer_name: reservationData.customer_name,
          customer_email: reservationData.customer_email || null,
          customer_phone: reservationData.customer_phone,
          party_size: reservationData.party_size,
          reservation_date: reservationData.reservation_date,
          reservation_time: reservationData.reservation_time,
          special_requests: reservationData.special_requests || null,
          status: 'pending'
        }]);

      if (error) throw error;

      showMessage('success', 'Votre réservation a été envoyée avec succès ! Le restaurant vous contactera pour confirmer.');
      setReservationData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        party_size: 2,
        reservation_date: '',
        reservation_time: '',
        special_requests: ''
      });
    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      showMessage('error', 'Erreur lors de l\'envoi de la réservation. Veuillez réessayer.');
    } finally {
      setReservationLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
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
      <div className="max-w-2xl mx-auto px-4">
        {/* Back Button */}
        <Link 
          to={`/m/${menu.slug}`}
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-8"
        >
          <ArrowLeft size={20} />
          <span>Retour à l'accueil</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl">🍽️</span>
          </div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: menu.couleur_secondaire }}
          >
            Réserver une table
          </h1>
          <h2 className="text-xl text-gray-600">{menu.nom}</h2>
          {menu.description && (
            <p className="text-gray-600 mt-2">{menu.description}</p>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Reservation Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              <input
                type="text"
                value={reservationData.customer_name}
                onChange={(e) => setReservationData(prev => ({ ...prev, customer_name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                placeholder="06 12 34 56 78"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (optionnel)
              </label>
              <input
                type="email"
                value={reservationData.customer_email}
                onChange={(e) => setReservationData(prev => ({ ...prev, customer_email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                placeholder="votre@email.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={reservationData.reservation_date}
                  onChange={(e) => setReservationData(prev => ({ ...prev, reservation_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de personnes *
              </label>
              <select
                value={reservationData.party_size}
                onChange={(e) => setReservationData(prev => ({ ...prev, party_size: parseInt(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                rows={4}
                placeholder="Allergies, préférences de table, occasion spéciale..."
              />
            </div>

            <button
              type="submit"
              disabled={reservationLoading}
              className="w-full py-4 px-6 rounded-lg text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
              style={{ backgroundColor: menu.couleur_primaire }}
            >
              {reservationLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  <span>Envoyer la réservation</span>
                </>
              )}
            </button>
          </form>

          {/* Information */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              ℹ️ <strong>Information :</strong> Votre réservation sera transmise au restaurant qui vous contactera 
              pour la confirmer. En cas d'urgence, vous pouvez les appeler directement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantReservation;