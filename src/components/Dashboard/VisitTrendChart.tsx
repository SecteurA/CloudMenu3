import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar } from 'lucide-react';

interface VisitData {
  date: string;
  qr_scan: number;
  gmb: number;
  direct_link: number;
  share: number;
  total: number;
}

interface VisitTrendChartProps {
  data: VisitData[];
  loading: boolean;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

const VisitTrendChart: React.FC<VisitTrendChartProps> = ({
  data,
  loading,
  timeRange,
  onTimeRangeChange
}) => {
  const timeRanges = [
    { value: '7', label: '7 derniers jours' },
    { value: '14', label: '14 derniers jours' },
    { value: '30', label: '30 derniers jours' }
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTooltipValue = (value: number, name: string) => {
    const labels: { [key: string]: string } = {
      qr_scan: 'Scans QR',
      gmb: 'Visites GMB',
      direct_link: 'Liens directs',
      share: 'Partages',
      total: 'Total'
    };
    return [value, labels[name] || name];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Évolution des visites
          </h3>
          <p className="text-sm text-gray-600">
            Comparaison par type d'accès
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-orange-500 focus:border-orange-500"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-80">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Chargement des données...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 mb-2">📊</div>
              <div className="text-gray-500">Aucune donnée disponible</div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#666"
                fontSize={12}
              />
              <YAxis stroke="#666" fontSize={12} />
              <Tooltip 
                formatter={formatTooltipValue}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="qr_scan" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Scans QR"
              />
              <Line 
                type="monotone" 
                dataKey="gmb" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Visites GMB"
              />
              <Line 
                type="monotone" 
                dataKey="direct_link" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Liens directs"
              />
              <Line 
                type="monotone" 
                dataKey="share" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Partages"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && data.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {data.reduce((sum, d) => sum + d.qr_scan, 0)}
            </div>
            <div className="text-xs text-gray-500">Total scans QR</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">
              {data.reduce((sum, d) => sum + d.gmb, 0)}
            </div>
            <div className="text-xs text-gray-500">Total GMB</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">
              {data.reduce((sum, d) => sum + d.direct_link, 0)}
            </div>
            <div className="text-xs text-gray-500">Liens directs</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {data.reduce((sum, d) => sum + d.share, 0)}
            </div>
            <div className="text-xs text-gray-500">Partages</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitTrendChart;