import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Phone, Mail, Plus, Search, Filter, Eye, Check, X, AlertCircle, ExternalLink, ChevronLeft, ChevronRight, Grid3x3 as Grid3X3, List, CalendarDays } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Reservation {
  id: string;
  menu_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests?: string;
  created_at: string;
  updated_at: string;
}

interface Menu {
  id: string;
  nom: string;
  slug: string;
}

type ViewType = 'list' | 'day' | 'week' | 'month';

const ReservationsPage = () => {
  const { user } = useAuth();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [viewType, setViewType] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (user) {
      loadUserMenu();
    }
  }, [user]);

  useEffect(() => {
    if (menu) {
      loadReservations();
    }
  }, [menu]);

  const loadUserMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('id, nom, slug')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors du chargement du menu:', error);
        return;
      }

      setMenu(data);
    } catch (error) {
      console.error('Erreur lors du chargement du menu:', error);
    }
  };

  const loadReservations = async () => {
    if (!menu) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('menu_id', menu.id)
        .order('reservation_date', { ascending: true })
        .order('reservation_time', { ascending: true });

      if (error) {
        console.error('Erreur lors du chargement des réservations:', error);
        return;
      }

      setReservations(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const updateReservationStatus = async (reservationId: string, status: Reservation['status']) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId);

      if (error) throw error;

      setReservations(prev => 
        prev.map(r => r.id === reservationId ? { ...r, status } : r)
      );

      const statusText = {
        'confirmed': 'confirmée',
        'cancelled': 'annulée',
        'completed': 'terminée',
        'pending': 'en attente'
      };

      showMessage('success', `Réservation ${statusText[status]} avec succès`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      showMessage('error', 'Erreur lors de la mise à jour');
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = 
      reservation.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.customer_phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'pending': return 'bg-orange-500';
      case 'confirmed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status: Reservation['status']) => {
    switch (status) {
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'confirmed': return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      case 'completed': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: Reservation['status']) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'cancelled': return 'Annulée';
      case 'completed': return 'Terminée';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  // Calendar functions
  const getReservationsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredReservations.filter(r => r.reservation_date === dateStr);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const renderCalendarHeader = () => {
    let title = '';
    switch (viewType) {
      case 'day':
        title = currentDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        break;
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        title = `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        break;
      case 'month':
        title = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        break;
    }

    return (
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateDate('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 capitalize">{title}</h3>
        <button
          onClick={() => navigateDate('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderDayView = () => {
    const dayReservations = getReservationsForDate(currentDate);
    const timeSlots = Array.from({ length: 14 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {renderCalendarHeader()}
        <div className="space-y-2">
          {timeSlots.map(time => {
            const reservationsAtTime = dayReservations.filter(r => r.reservation_time.startsWith(time.split(':')[0]));
            return (
              <div key={time} className="flex items-center border-b border-gray-100 pb-2">
                <div className="w-16 text-sm text-gray-600 font-medium">{time}</div>
                <div className="flex-1 ml-4">
                  {reservationsAtTime.length > 0 ? (
                    <div className="space-y-1">
                      {reservationsAtTime.map(reservation => (
                        <div key={reservation.id} className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(reservation.status)}`}></div>
                          <span className="text-sm font-medium">{reservation.customer_name}</span>
                          <span className="text-xs text-gray-500">({reservation.party_size} pers.)</span>
                          <span className="text-xs text-gray-500">{formatTime(reservation.reservation_time)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Libre</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const timeSlots = Array.from({ length: 14 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {renderCalendarHeader()}
        <div className="grid grid-cols-8 gap-1 text-sm">
          <div className="font-medium text-gray-600 p-2"></div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="font-medium text-gray-600 p-2 text-center">
              <div>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
              <div className="text-lg">{day.getDate()}</div>
            </div>
          ))}
          
          {timeSlots.map(time => (
            <React.Fragment key={time}>
              <div className="p-2 text-gray-600 font-medium border-r border-gray-100">{time}</div>
              {weekDays.map(day => {
                const dayReservations = getReservationsForDate(day).filter(r => r.reservation_time.startsWith(time.split(':')[0]));
                return (
                  <div key={`${day.toISOString()}-${time}`} className="p-1 border-r border-gray-100 min-h-[40px]">
                    {dayReservations.map(reservation => (
                      <div key={reservation.id} className={`text-xs p-1 rounded mb-1 text-white ${getStatusColor(reservation.status)}`}>
                        <div className="font-medium truncate">{reservation.customer_name}</div>
                        <div>{reservation.party_size}p {formatTime(reservation.reservation_time)}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const currentMonth = currentDate.getMonth();

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {renderCalendarHeader()}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-600 text-sm">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const isCurrentMonth = day.getMonth() === currentMonth;
            const dayReservations = getReservationsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={day.toISOString()}
                className={`min-h-[80px] p-2 border border-gray-100 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'} ${isToday ? 'ring-2 ring-orange-500' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayReservations.slice(0, 3).map(reservation => (
                    <div 
                      key={reservation.id} 
                      className={`text-xs p-1 rounded text-white ${getStatusColor(reservation.status)}`}
                    >
                      <div className="font-medium truncate">{reservation.customer_name}</div>
                      <div>{formatTime(reservation.reservation_time)}</div>
                    </div>
                  ))}
                  {dayReservations.length > 3 && (
                    <div className="text-xs text-gray-500">+{dayReservations.length - 3} autres</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading && !menu) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Configurez d'abord votre menu</h2>
        <p className="text-gray-600 mb-6">
          Vous devez d'abord configurer votre menu pour pouvoir gérer les réservations.
        </p>
        <button 
          onClick={() => window.location.href = '/mon-menu'}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
        >
          Aller à la configuration
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des réservations</h1>
          <p className="text-gray-600">Gérez les réservations de table de votre restaurant</p>
        </div>
        <div className="flex items-center space-x-3">
          <a 
            href={`/m/${menu.slug}`} 
            target="_blank"
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2 text-sm"
          >
            <ExternalLink size={16} />
            <span>Voir le menu</span>
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{reservations.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-orange-600">
                {reservations.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Confirmées</p>
              <p className="text-2xl font-bold text-green-600">
                {reservations.filter(r => r.status === 'confirmed').length}
              </p>
            </div>
            <Check className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cette semaine</p>
              <p className="text-2xl font-bold text-blue-600">
                {reservations.filter(r => {
                  const reservationDate = new Date(r.reservation_date);
                  const today = new Date();
                  const weekFromNow = new Date(today);
                  weekFromNow.setDate(today.getDate() + 7);
                  return reservationDate >= today && reservationDate <= weekFromNow;
                }).length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* View Type Selector */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewType('list')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewType === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List size={16} />
              <span>Liste</span>
            </button>
            <button
              onClick={() => setViewType('day')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewType === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDays size={16} />
              <span>Jour</span>
            </button>
            <button
              onClick={() => setViewType('week')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewType === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 size={16} />
              <span>Semaine</span>
            </button>
            <button
              onClick={() => setViewType('month')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewType === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar size={16} />
              <span>Mois</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmées</option>
                  <option value="cancelled">Annulées</option>
                  <option value="completed">Terminées</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Legend for Calendar Views */}
      {viewType !== 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Légende des couleurs</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm text-gray-600">En attente</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">Confirmée</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-600">Annulée</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-600">Terminée</span>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Views */}
      {viewType === 'day' && renderDayView()}
      {viewType === 'week' && renderWeekView()}
      {viewType === 'month' && renderMonthView()}

      {/* List View */}
      {viewType === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-600">Chargement des réservations...</div>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {reservations.length === 0 ? 'Aucune réservation' : 'Aucun résultat'}
              </h3>
              <p className="text-gray-600">
                {reservations.length === 0 
                  ? 'Les clients pourront faire des réservations via votre menu en ligne.' 
                  : 'Aucune réservation ne correspond à vos critères de recherche.'
                }
              </p>
              {reservations.length === 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Comment ça marche :</strong> Un bouton "Réserver une table" sera automatiquement 
                    ajouté à votre menu en ligne. Les clients pourront faire des réservations directement 
                    depuis votre menu.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredReservations.map((reservation) => (
                <div key={reservation.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {reservation.customer_name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusTextColor(reservation.status)}`}>
                          {getStatusText(reservation.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(reservation.reservation_date)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(reservation.reservation_time)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{reservation.party_size} personne{reservation.party_size > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{reservation.customer_phone}</span>
                        </div>
                      </div>

                      {reservation.customer_email && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                          <Mail className="w-4 h-4" />
                          <span>{reservation.customer_email}</span>
                        </div>
                      )}

                      {reservation.special_requests && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Demandes spéciales :</p>
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {reservation.special_requests}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {reservation.status === 'pending' && (
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center space-x-1"
                        >
                          <Check size={14} />
                          <span>Confirmer</span>
                        </button>
                        <button
                          onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center space-x-1"
                        >
                          <X size={14} />
                          <span>Annuler</span>
                        </button>
                      </div>
                    )}

                    {reservation.status === 'confirmed' && (
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => updateReservationStatus(reservation.id, 'completed')}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
                        >
                          <Check size={14} />
                          <span>Terminer</span>
                        </button>
                        <button
                          onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center space-x-1"
                        >
                          <X size={14} />
                          <span>Annuler</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReservationsPage;