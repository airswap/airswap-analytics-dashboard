import { useState, useEffect } from 'react';
import { TOKEN_ANALYTICS_SWAPS_QUERY } from '@/app/api/graphql/queries';
import { secureRequest } from '@/lib/utils';
import { Swap } from '../token-analytics/types';

interface TraderVolume {
  address: string;
  totalVolume: number;
  swapCount: number;
}

function aggregateTraderVolumes(swaps: Swap[]): TraderVolume[] {
  const traderMap: Record<string, { volume: number; count: number }> = {};
  swaps.forEach(swap => {
    const trader = swap.from ? swap.from.toLowerCase() : '';
    if (!trader) return;
    if (!traderMap[trader]) traderMap[trader] = { volume: 0, count: 0 };
    traderMap[trader].volume += parseFloat(swap.senderAmountUSD);
    traderMap[trader].count += 1;
  });
  return Object.entries(traderMap)
    .map(([address, { volume, count }]) => ({ address, totalVolume: volume, swapCount: count }))
    .sort((a, b) => b.totalVolume - a.totalVolume);
}

export function TraderAnalytics() {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSwaps = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const timestamp24h = now - (24 * 60 * 60);
        const response = await secureRequest<any>(
          TOKEN_ANALYTICS_SWAPS_QUERY,
          { timestamp: timestamp24h }
        );
        if (!response.data || !('swapERC20S' in response.data)) {
          throw new Error('Invalid response data');
        }
        setSwaps((response.data as any).swapERC20S);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        setLoading(false);
      }
    };
    fetchSwaps();
    const interval = setInterval(fetchSwaps, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-4">Loading trader analytics...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!swaps.length) return <div className="p-4">No swap data available.</div>;

  const topTraders = aggregateTraderVolumes(swaps).slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-2xl font-bold mb-6">Top Traders by Volume (24h)</h2>
      <div className="space-y-2">
        {topTraders.map(trader => (
          <div key={trader.address} className="flex justify-between items-center p-2 hover:bg-gray-100 rounded">
            <span className="font-mono">{trader.address.slice(0, 6)}...{trader.address.slice(-4)}</span>
            <span className="text-right font-medium">${trader.totalVolume.toLocaleString(undefined, {maximumFractionDigits: 2})} <span className="text-xs text-gray-500">({trader.swapCount} swaps)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
} 