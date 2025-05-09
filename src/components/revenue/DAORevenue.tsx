import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { DailyData } from './types';

const PERIODS = [
  { label: '1M', days: 30 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '4Y', days: 1460 },
];

type PeriodLabel = '1M' | '6M' | '1Y' | '4Y';

function aggregateRevenue(dailyData: DailyData[], days: number) {
  const now = Math.floor(Date.now() / 1000);
  const since = now - days * 24 * 60 * 60;
  return dailyData
    .filter(day => day.date >= since)
    .reduce((sum, day) => sum + parseFloat(day.fees || '0'), 0);
}

export function DAORevenue({ dailyData }: { dailyData: DailyData[] }) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodLabel>('1M');
  const [chartData, setChartData] = useState<any[]>([]);
  const periodDays = PERIODS.find(p => p.label === selectedPeriod)?.days || 30;
  const now = Math.floor(Date.now() / 1000);
  const since = now - periodDays * 24 * 60 * 60;
  const filtered = dailyData.filter(day => day.date >= since);
  const revenue = filtered.reduce((sum, day) => sum + parseFloat(day.fees || '0'), 0);

  // Debug logging
  console.log(`[DAORevenue] Period: ${selectedPeriod}, Days: ${filtered.length}, Total: $${revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

  useEffect(() => {
    const filteredData = filtered
      .map(day => ({
        date: new Date(day.date * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        fees: parseFloat(day.fees || '0'),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setChartData(filteredData);
  }, [dailyData, periodDays]);

  const average = chartData.length ? chartData.reduce((sum, d) => sum + d.fees, 0) / chartData.length : 0;

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-xl font-bold">DAO Revenue</h2>
        <div className="flex gap-2">
          {PERIODS.map(({ label }) => (
            <button
              key={label}
              className={`px-3 py-1 rounded font-medium border transition-colors text-sm ${selectedPeriod === label ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setSelectedPeriod(label as PeriodLabel)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <div className="text-lg text-gray-500 mb-1">Total Revenue</div>
            <div className="text-3xl font-bold mb-1">${revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="text-sm text-gray-500">Daily Average: ${average.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div className="w-full md:w-2/3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} interval="preserveStart" />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Fees']} labelFormatter={(label) => label} contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '8px' }} />
                <Bar dataKey="fees" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
