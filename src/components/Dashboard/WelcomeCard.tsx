import React, { useState, useEffect } from 'react';
import { QrCode, Eye, TrendingUp, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import VisitTrendChart from './VisitTrendChart';

interface VisitData {
  date: string;
  qr_scan: number;
  gmb: number;
  direct_link: number;
  share: number;
  total: number;
}

const WelcomeCard = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7');
  const [visitTrendData, setVisitTrendData] = useState<VisitData[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [stats, setStats] = useState([
    { icon: QrCode, label: 'Scans QR Code', value: '0', change: 'Chargement...', color: 'text-blue-600' },
    { icon: Building, label: 'Visites GMB', value: '0', change: 'Chargement...', color: 'text-purple-600' },
    { icon: Eye, label: 'Vues directes', value: '0', change: 'Chargement...', color: 'text-orange-600' },
    { icon: TrendingUp, label: 'Vues totales', value: '0', change: 'Chargement...', color: 'text-purple-600' }
  ]);
  const [loading, setLoading] = useState(true);
  const [dataLoadedAt, setDataLoadedAt] = useState<number>(0);

  useEffect(() => {
    if (user) {
      // Add a small delay and debounce to prevent rapid re-renders
      const now = Date.now();
      if (now - dataLoadedAt > 5000) { // Only reload if more than 5 seconds since last load
        setDataLoadedAt(now);
        loadStats();
        loadVisitTrendData();
      }
    }
  }, [user, timeRange, dataLoadedAt]);

  // Handle tab visibility changes to prevent failed requests
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Tab became visible again, refresh data if it's been a while
        const now = Date.now();
        if (now - dataLoadedAt > 30000) { // Refresh if more than 30 seconds old
          setDataLoadedAt(now);
          loadStats();
          loadVisitTrendData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, dataLoadedAt]);

  const loadVisitTrendData = async () => {
    if (!user) return;

    // Don't load data if tab is hidden
    if (document.hidden) return;

    setChartLoading(true);
    try {
      // Get user's menu
      const { data: menu, error: menuError } = await supabase
        .from('menus')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (menuError || !menu) {
        setVisitTrendData([]);
        return;
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Get analytics data for the specified range
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('menu_analytics')
        .select('visit_type, visited_at')
        .eq('menu_id', menu.id)
        .gte('visited_at', startDate.toISOString())
        .lte('visited_at', endDate.toISOString())
        .order('visited_at', { ascending: true });

      if (analyticsError) {
        setVisitTrendData([]);
        return;
      }

      // Group data by date and visit type
      const groupedData: { [key: string]: { [key: string]: number } } = {};
      
      // Initialize all dates in range with zero values
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        groupedData[dateStr] = {
          qr_scan: 0,
          gmb: 0,
          direct_link: 0,
          share: 0,
          total: 0
        };
      }

      // Populate with actual data
      analyticsData?.forEach(record => {
        const date = record.visited_at.split('T')[0];
        if (groupedData[date]) {
          groupedData[date][record.visit_type]++;
          groupedData[date].total++;
        }
      });

      // Convert to array format for chart
      const chartData: VisitData[] = Object.entries(groupedData)
        .map(([date, visits]) => ({
          date,
          qr_scan: visits.qr_scan,
          gmb: visits.gmb,
          direct_link: visits.direct_link,
          share: visits.share,
          total: visits.total
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setVisitTrendData(chartData);
    } catch (error) {
      console.error('Error loading trend data:', error);
      setVisitTrendData([]);
    } finally {
      setChartLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Don't load data if tab is hidden
    if (document.hidden) return;

    try {
      // Get user's menu
      const { data: menu, error: menuError } = await supabase
        .from('menus')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (menuError || !menu) {
        setStats(prev => prev.map(stat => ({ ...stat, value: '0', change: 'Aucune donnée' })));
        setLoading(false);
        return;
      }

      // Get menu items count
      const { data: menuItems, error: itemsError } = await supabase
        .from('menu_items')
        .select('id, disponible, categories!inner(menu_id)')
        .eq('categories.menu_id', menu.id);

      if (itemsError) {
        console.warn('Error loading menu items:', itemsError);
      }

      // Get analytics data
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Total views
      const promises = [
        supabase.from('menu_analytics').select('id').eq('menu_id', menu.id),
        supabase.from('menu_analytics').select('id').eq('menu_id', menu.id).eq('visit_type', 'qr_scan'),
        supabase.from('menu_analytics').select('id').eq('menu_id', menu.id).eq('visit_type', 'gmb'),
        supabase.from('menu_analytics').select('id').eq('menu_id', menu.id).eq('visit_type', 'qr_scan').gte('visited_at', today.toISOString()),
        supabase.from('menu_analytics').select('id').eq('menu_id', menu.id).eq('visit_type', 'gmb').gte('visited_at', today.toISOString()),
        supabase.from('menu_analytics').select('id').eq('menu_id', menu.id).gte('visited_at', weekAgo.toISOString())
      ];

      const results = await Promise.allSettled(promises);
      
      const totalViews = results[0].status === 'fulfilled' ? results[0].value.data : [];
      const qrScans = results[1].status === 'fulfilled' ? results[1].value.data : [];
      const gmbVisits = results[2].status === 'fulfilled' ? results[2].value.data : [];
      const todayQrScans = results[3].status === 'fulfilled' ? results[3].value.data : [];
      const todayGmbVisits = results[4].status === 'fulfilled' ? results[4].value.data : [];
      const weekViews = results[5].status === 'fulfilled' ? results[5].value.data : [];

      const totalViewsCount = totalViews?.length || 0;
      const qrScansCount = qrScans?.length || 0;
      const gmbVisitsCount = gmbVisits?.length || 0;
      const todayQrScansCount = todayQrScans?.length || 0;
      const todayGmbVisitsCount = todayGmbVisits?.length || 0;
      const weekViewsCount = weekViews?.length || 0;
      const directViews = totalViewsCount - qrScansCount - gmbVisitsCount;

      setStats([
        {
          icon: QrCode,
          label: 'Scans QR Code',
          value: qrScansCount.toString(),
          change: todayQrScansCount > 0 ? `+${todayQrScansCount} aujourd'hui` : 'Aucun scan aujourd\'hui',
          color: 'text-blue-600'
        },
        {
          icon: Building,
          label: 'Visites GMB',
          value: gmbVisitsCount.toString(),
          change: todayGmbVisitsCount > 0 ? `+${todayGmbVisitsCount} aujourd'hui` : 'Aucune visite GMB aujourd\'hui',
          color: 'text-purple-600'
        },
        {
          icon: Eye,
          label: 'Vues directes',
          value: directViews.toString(),
          change: directViews > 0 ? `${directViews} liens directs` : 'Aucune vue directe',
          color: 'text-orange-600'
        },
        {
          icon: TrendingUp,
          label: 'Total des vues',
          value: totalViewsCount.toString(),
          change: `${qrScansCount} QR + ${gmbVisitsCount} GMB + ${directViews} directes`,
          color: 'text-purple-600'
        }
      ]);

    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(prev => prev.map(stat => ({ ...stat, value: '0', change: 'Erreur de chargement' })));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue sur CloudMenu ! 👋</h2>
        <p className="text-gray-600">
          Gérez facilement votre menu en ligne et offrez une expérience moderne à vos clients.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={`text-xs ${stat.color} mt-1`}>{stat.change}</p>
              </div>
              <div className={`p-3 rounded-full bg-gray-100`}>
                <stat.icon size={24} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visit Trend Chart */}
      <VisitTrendChart 
        data={visitTrendData}
        loading={chartLoading}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
    </div>
  );
};

export default WelcomeCard;