'use client';

import { useState, useEffect } from 'react';
import { DAORevenue } from '@/components/revenue/DAORevenue';
import { VolumeStats } from '@/components/volume/VolumeStats';
import { DailyVolume } from '@/components/volume/DailyVolume';
import { BiggestSwaps } from '@/components/swaps/BiggestSwaps';
import { MarketMakers } from '@/components/market-makers/MarketMakers';
import { TokenAnalytics } from '@/components/token-analytics/TokenAnalytics';
import { SwapData } from '@/components/swaps/type';
import { ServerData } from '@/components/market-makers/types';
import { DailyData } from '@/components/revenue/types';
import { VolumeData } from '@/components/volume/type';
import { DAILY_VOLUME_QUERY, BIGGEST_SWAPS_QUERY, SERVERS_QUERY } from '@/app/api/graphql/queries';
import { secureRequest } from '@/lib/utils';

export default function Home() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [volumes, setVolumes] = useState<VolumeData | null>(null);
  const [biggestSwaps, setBiggestSwaps] = useState<{
    '24h': SwapData[];
    '7d': SwapData[];
    '30d': SwapData[];
  } | null>(null);
  const [servers, setServers] = useState<ServerData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const timestamp24h = now - (24 * 60 * 60);
        const timestamp7d = now - (7 * 24 * 60 * 60);
        const timestamp30d = now - (30 * 24 * 60 * 60);
        const timestamp4y = now - (4 * 365 * 24 * 60 * 60);

        const [dailyResponse, swapsResponse, serversResponse] = await Promise.all([
          secureRequest<{ dailies: DailyData[] }>(
            DAILY_VOLUME_QUERY,
            {
              timestamp: timestamp4y
            }
          ),
          secureRequest<{
            last24h: SwapData[];
            last7d: SwapData[];
            last30d: SwapData[];
          }>(
            BIGGEST_SWAPS_QUERY,
            { 
              timestamp24h,
              timestamp7d,
              timestamp30d,
              minAmount: "50000"
            }
          ),
          secureRequest<{ servers: ServerData[] }>(
            SERVERS_QUERY
          ),
        ]);

        if (!dailyResponse.data || !swapsResponse.data || !serversResponse.data) {
          throw new Error('Invalid response data');
        }

        setDailyData(dailyResponse.data.dailies);

        // Calculate volumes for the cards
        const calculateRollingVolume = (data: DailyData[], fromTimestamp: number) => {
          let totalVolume = 0;
          
          data.forEach(day => {
            const dayStart = day.date;
            const dayEnd = dayStart + (24 * 60 * 60);
            const dailyVolume = parseFloat(day.volume || '0');

            const overlapStart = Math.max(dayStart, fromTimestamp);
            const overlapEnd = Math.min(dayEnd, now);

            if (overlapEnd > overlapStart) {
              const overlapDuration = overlapEnd - overlapStart;
              const dayDuration = dayEnd - dayStart;
              const proportion = overlapDuration / dayDuration;
              
              totalVolume += dailyVolume * proportion;
            }
          });

          return totalVolume;
        };

        const volumeData = {
          '24h': calculateRollingVolume(dailyResponse.data.dailies, timestamp24h),
          '7d': calculateRollingVolume(dailyResponse.data.dailies, timestamp7d),
          '30d': calculateRollingVolume(dailyResponse.data.dailies, timestamp30d)
        };

        setVolumes(volumeData);
        setBiggestSwaps({
          '24h': swapsResponse.data.last24h,
          '7d': swapsResponse.data.last7d,
          '30d': swapsResponse.data.last30d
        });
        setServers(serversResponse.data.servers);
        setLoading(false);

      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {volumes && <VolumeStats volumes={volumes} />}
        <DAORevenue dailyData={dailyData} />
        <DailyVolume dailyData={dailyData} />
        <MarketMakers servers={servers} />
        <TokenAnalytics />
        {biggestSwaps && (
          <BiggestSwaps 
            swaps={biggestSwaps}
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={setSelectedTimeframe}
          />
        )}
      </div>
    </main>
  );
}