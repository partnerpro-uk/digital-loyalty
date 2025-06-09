import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';

// Types for our dashboard data
type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';

interface DashboardMetrics {
  totalCustomers: { current: number; change: number };
  repeatCustomers: { current: number; change: number };
  newCustomers: { current: number; change: number };
  roi: { amount: number; percentage: number };
  rlc: number;
  lpc: number;
  avgCostOfSale: number;
}

interface Customer {
  id: string;
  name: string;
  visits: number;
  spent: number;
  lastVisit: string;
  referrals?: number;
}

// Mock data generator
const generateMockData = (period: TimePeriod) => {
  const now = new Date();
  const getDateRange = () => {
    switch (period) {
      case 'day':
        return Array.from({ length: 24 }, (_, i) => {
          const date = new Date(now);
          date.setHours(i, 0, 0, 0);
          return date;
        });
      case 'week':
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (6 - i));
          return date;
        });
      case 'month':
        return Array.from({ length: 30 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (29 - i));
          return date;
        });
      case 'year':
        return Array.from({ length: 12 }, (_, i) => {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (11 - i));
          return date;
        });
      default:
        return Array.from({ length: 30 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (29 - i));
          return date;
        });
    }
  };

  const dates = getDateRange();
  
  return {
    metrics: {
      totalCustomers: { current: 1247, change: 12.5 },
      repeatCustomers: { current: 892, change: 8.3 },
      newCustomers: { current: 355, change: 18.7 },
      roi: { amount: 4250, percentage: 285 },
      rlc: 15780,
      lpc: 4125,
      avgCostOfSale: 12.50
    },
    charts: {
      customerTrend: dates.map((date, i) => ({
        date: date.toISOString(),
        total: Math.floor(Math.random() * 50) + 30,
        repeat: Math.floor(Math.random() * 30) + 15,
        new: Math.floor(Math.random() * 20) + 10
      })),
      roiTrend: dates.map((date, i) => ({
        date: date.toISOString(),
        roi: Math.floor(Math.random() * 100) + 200,
        revenue: Math.floor(Math.random() * 2000) + 1000,
        cost: Math.floor(Math.random() * 500) + 300
      })),
      retentionRate: dates.map((date, i) => ({
        date: date.toISOString(),
        rate: Math.floor(Math.random() * 20) + 70
      })),
      peakTimes: period === 'day' 
        ? Array.from({ length: 24 }, (_, i) => ({
            hour: `${i}:00`,
            visits: Math.floor(Math.random() * 40) + 5
          }))
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
            day,
            visits: Math.floor(Math.random() * 80) + 20
          }))
    },
    insights: {
      topCustomers: [
        { id: '1', name: 'Sarah Johnson', visits: 47, spent: 1250.00, lastVisit: '2024-01-08' },
        { id: '2', name: 'Mike Chen', visits: 42, spent: 980.50, lastVisit: '2024-01-07' },
        { id: '3', name: 'Emily Davis', visits: 38, spent: 1100.25, lastVisit: '2024-01-08' },
        { id: '4', name: 'James Wilson', visits: 35, spent: 875.00, lastVisit: '2024-01-06' },
        { id: '5', name: 'Lisa Garcia', visits: 33, spent: 920.75, lastVisit: '2024-01-08' }
      ],
      referralLeaders: [
        { id: '1', name: 'Sarah Johnson', referrals: 12, value: 480.00 },
        { id: '2', name: 'Mike Chen', referrals: 8, value: 320.00 },
        { id: '3', name: 'Emily Davis', referrals: 6, value: 240.00 },
        { id: '4', name: 'James Wilson', referrals: 5, value: 200.00 },
        { id: '5', name: 'Lisa Garcia', referrals: 4, value: 160.00 }
      ],
      demographics: {
        gender: [
          { name: 'Female', value: 58, color: '#8884d8' },
          { name: 'Male', value: 42, color: '#82ca9d' }
        ],
        age: [
          { range: '18-24', count: 85 },
          { range: '25-34', count: 234 },
          { range: '35-44', count: 312 },
          { range: '45-54', count: 198 },
          { range: '55+', count: 97 }
        ],
        device: [
          { name: 'iOS', value: 65, color: '#8884d8' },
          { name: 'Android', value: 35, color: '#82ca9d' }
        ]
      },
      engagement: {
        avgVisitsPerCustomer: 6.8,
        medianDaysSinceVisit: 12,
        atRiskCount: 89
      }
    },
    healthScore: {
      status: 'good' as const,
      message: '🎉 Loyalty program performing well! Retention up 8% this month.'
    }
  };
};

const IndividualDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  const mockData = useMemo(() => generateMockData(selectedPeriod), [selectedPeriod]);

  const timePeriods: { value: TimePeriod; label: string }[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'all', label: 'All Time' },
    { value: 'custom', label: 'Custom' }
  ];

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Loyalty Program Dashboard</h1>
        <p className="text-gray-600">Monitor your loyalty program performance and customer insights</p>
      </div>

      {/* Time Period Selector */}
      <div className="mb-8 bg-white border border-gray-200 p-6">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-gray-700 mr-4">Time Period:</span>
          {timePeriods.map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                selectedPeriod === period.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
        
        {selectedPeriod === 'custom' && (
          <div className="mt-4 flex gap-4 items-center">
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="border border-gray-300 px-3 py-2 focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              placeholder="Start date"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="border border-gray-300 px-3 py-2 focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              placeholder="End date"
            />
          </div>
        )}
      </div>

      {/* Section 1: Customer Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Customer Overview</h2>
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Total Customers"
            value={mockData.metrics.totalCustomers.current.toLocaleString()}
            change={mockData.metrics.totalCustomers.change}
            icon="👥"
          />
          <MetricCard
            title="Repeat Customers"
            value={mockData.metrics.repeatCustomers.current.toLocaleString()}
            change={mockData.metrics.repeatCustomers.change}
            icon="🔄"
          />
          <MetricCard
            title="New Customers"
            value={mockData.metrics.newCustomers.current.toLocaleString()}
            change={mockData.metrics.newCustomers.change}
            icon="✨"
          />
        </div>

        {/* Customer Trend Chart */}
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Customer Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData.charts.customerTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip 
                labelFormatter={(value: string) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [value, name === 'total' ? 'Total' : name === 'repeat' ? 'Repeat' : 'New']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar dataKey="total" fill="#1f2937" name="total" />
              <Bar dataKey="repeat" fill="#059669" name="repeat" />
              <Bar dataKey="new" fill="#d97706" name="new" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 2: Loyalty ROI Analysis */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Loyalty ROI Analysis</h2>
        
        {/* ROI Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">ROI</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(mockData.metrics.roi.amount)} ({mockData.metrics.roi.percentage}%)
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 border border-green-200 flex items-center justify-center">
                <span className="text-lg">📈</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">Revenue from loyalty / subscription cost</p>
          </div>
          
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Revenue from Loyalty</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(mockData.metrics.rlc)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 border border-blue-200 flex items-center justify-center">
                <span className="text-lg">💰</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">Total revenue from loyalty customers</p>
          </div>
          
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Program Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(mockData.metrics.lpc)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 border border-orange-200 flex items-center justify-center">
                <span className="text-lg">💳</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">Monthly loyalty program costs</p>
          </div>
          
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Avg Cost of Sale</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(mockData.metrics.avgCostOfSale)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 border border-purple-200 flex items-center justify-center">
                <span className="text-lg">🎯</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">Average cost per customer acquisition</p>
          </div>
        </div>

        {/* Revenue vs Cost Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Revenue vs Cost Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockData.charts.roiTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip 
                  labelFormatter={(value: string) => new Date(value).toLocaleDateString()}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value), 
                    name === 'revenue' ? 'Revenue' : 'Cost'
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line dataKey="revenue" stroke="#059669" strokeWidth={3} name="revenue" />
                <Line dataKey="cost" stroke="#dc2626" strokeWidth={3} name="cost" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">ROI Percentage Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockData.charts.roiTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  stroke="#64748b"
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip 
                  labelFormatter={(value: string) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [`${value}%`, 'ROI']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line dataKey="roi" stroke="#8b5cf6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 3: Engagement & Retention */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Engagement & Retention</h2>
        
        {/* Health Score Alert */}
        <div className={`mb-8 p-4 border-l-4 ${
          mockData.healthScore.status === 'good' ? 'bg-green-50 border-green-400' :
          mockData.healthScore.status === 'warning' ? 'bg-yellow-50 border-yellow-400' :
          'bg-red-50 border-red-400'
        }`}>
          <p className={`font-medium ${
            mockData.healthScore.status === 'good' ? 'text-green-800' :
            mockData.healthScore.status === 'warning' ? 'text-yellow-800' :
            'text-red-800'
          }`}>
            {mockData.healthScore.message}
          </p>
        </div>

        {/* Retention and Engagement Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Retention Rate Chart */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Customer Retention Rate</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockData.charts.retentionRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  stroke="#64748b"
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip 
                  labelFormatter={(value: string) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [`${value}%`, 'Retention Rate']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area dataKey="rate" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement Metrics */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Avg Visits per Customer</p>
                  <p className="text-2xl font-bold text-gray-900">{mockData.insights.engagement.avgVisitsPerCustomer}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <span className="text-lg">🔄</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Average number of visits per customer</p>
            </div>
            
            <div className="bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Days Since Last Visit</p>
                  <p className="text-2xl font-bold text-gray-900">{mockData.insights.engagement.medianDaysSinceVisit}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-50 border border-yellow-200 flex items-center justify-center">
                  <span className="text-lg">📅</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Median days since last customer visit</p>
            </div>
            
            <div className="bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">At-Risk Customers</p>
                  <p className="text-2xl font-bold text-red-600">{mockData.insights.engagement.atRiskCount}</p>
                </div>
                <div className="w-12 h-12 bg-red-50 border border-red-200 flex items-center justify-center">
                  <span className="text-lg">⚠️</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Customers with no visit in 30+ days</p>
            </div>
          </div>
        </div>

        {/* Peak Times Chart */}
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">When Loyalty Members Visit</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData.charts.peakTimes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey={selectedPeriod === 'day' ? 'hour' : 'day'}
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip 
                formatter={(value: number) => [value, 'Visits']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar dataKey="visits" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 4: Customer Insights */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Customer Insights</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referral Leaderboard */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Referral Leaderboard</h3>
            <div className="space-y-4">
              {mockData.insights.referralLeaders.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.referrals} referrals</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(customer.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demographics */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Demographics</h3>
            
            {/* Gender Chart */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Gender Distribution</h4>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={mockData.insights.demographics.gender}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={50}
                    dataKey="value"
                  >
                    {mockData.insights.demographics.gender.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Percentage']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-2">
                {mockData.insights.demographics.gender.map((entry) => (
                  <div key={entry.name} className="flex items-center space-x-1">
                    <div className={`w-3 h-3`} style={{ backgroundColor: entry.color }}></div>
                    <span className="text-xs text-gray-600">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Age Distribution */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Age Distribution</h4>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={mockData.insights.demographics.age}>
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis hide />
                  <Bar dataKey="count" fill="#6b7280" />
                  <Tooltip />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Device Type */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Device Type</h4>
              <div className="space-y-2">
                {mockData.insights.demographics.device.map((device) => (
                  <div key={device.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{device.name}</span>
                    <span className="text-sm font-medium text-gray-900">{device.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Customers Table */}
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Top 10 Customers</h3>
            <div className="overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Visits</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockData.insights.topCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.lastVisit}</p>
                        </div>
                      </td>
                      <td className="py-2 text-sm text-gray-900">{customer.visits}</td>
                      <td className="py-2 text-sm font-medium text-gray-900">{formatCurrency(customer.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Export and Actions Footer */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors">
              📊 Export as PDF
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
              📈 Download CSV
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
              📅 Schedule Report
            </button>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component with updated styling
interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon }) => {
  const isPositive = change > 0;
  
  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="w-12 h-12 bg-gray-50 border border-gray-200 flex items-center justify-center">
          <span className="text-lg">{icon}</span>
        </div>
      </div>
      <div className="flex items-center">
        <span className={`text-sm font-medium ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
          {isPositive ? '↗' : '↘'} {Math.abs(change).toFixed(1)}%
        </span>
        <span className="text-sm text-gray-500 ml-2">vs previous period</span>
      </div>
    </div>
  );
};

export default IndividualDashboard; 