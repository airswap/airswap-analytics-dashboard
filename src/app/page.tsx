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
import { 
  DAILY_VOLUME_QUERY, 
  BIGGEST_SWAPS_QUERY, 
  SERVERS_QUERY, 
  TOTAL_STATS_QUERY,
  fetchAllData
} from './api/graphql/queries';
import { secureRequest } from '@/lib/utils';

interface TotalStats {
  id: string;
  volume: string;
  fees: string;
}

interface ServersData {
  servers: ServerData[];
}

interface TotalsData {
  totals: TotalStats[];
}

interface ServersResponse {
  data: ServersData;
}

interface TotalsResponse {
  data: TotalsData;
}

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
  const [totalStats, setTotalStats] = useState<TotalStats | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const now = Math.floor(Date.now() / 1000);
        const timestamp24h = now - (24 * 60 * 60);
        const timestamp7d = now - (7 * 24 * 60 * 60);
        const timestamp30d = now - (30 * 24 * 60 * 60);
        const timestamp4y = now - (4 * 365 * 24 * 60 * 60);

        // Use individual fetch calls instead of batchRequests
        const [
          dailyResults,
          last24hResults,
          last7dResults,
          last30dResults,
          serversResponse,
          totalsResponse
        ] = await Promise.all([
          // Daily data
          fetchAllData<DailyData>(
            DAILY_VOLUME_QUERY,
            { timestamp: timestamp4y, skip: 0 },
            'dailies'
          ),
          
          // Biggest swaps
          fetchAllData<SwapData>(
            BIGGEST_SWAPS_QUERY,
            { 
              timestamp24h,
              timestamp7d,
              timestamp30d,
              minAmount: "50000",
              skip: 0
            },
            'last24h'
          ),
          fetchAllData<SwapData>(
            BIGGEST_SWAPS_QUERY,
            { 
              timestamp24h,
              timestamp7d,
              timestamp30d,
              minAmount: "50000",
              skip: 0
            },
            'last7d'
          ),
          fetchAllData<SwapData>(
            BIGGEST_SWAPS_QUERY,
            { 
              timestamp24h,
              timestamp7d,
              timestamp30d,
              minAmount: "50000",
              skip: 0
            },
            'last30d'
          ),
          
          // Servers data
          secureRequest<ServersData>(SERVERS_QUERY),
          
          // Total stats
          secureRequest<TotalsData>(TOTAL_STATS_QUERY)
        ]);
        
        // Process the results
        setDailyData(dailyResults || []);
        
        if (serversResponse && serversResponse.data && serversResponse.data.servers) {
          setServers(serversResponse.data.servers);
        }
        
        if (totalsResponse && totalsResponse.data && totalsResponse.data.totals && totalsResponse.data.totals.length > 0) {
          setTotalStats(totalsResponse.data.totals[0]);
        }

        // Calculate volumes for the cards
        const volumeData = {
          '24h': calculateRollingVolume(dailyResults || [], timestamp24h),
          '7d': calculateRollingVolume(dailyResults || [], timestamp7d),
          '30d': calculateRollingVolume(dailyResults || [], timestamp30d)
        };

        setVolumes(volumeData);
        setBiggestSwaps({
          '24h': last24hResults || [],
          '7d': last7dResults || [],
          '30d': last30dResults || []
        });
        
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

  // Calculate rolling volume function
  const calculateRollingVolume = (data: DailyData[], fromTimestamp: number) => {
    let totalVolume = 0;
    const now = Math.floor(Date.now() / 1000);
    
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

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {volumes && <VolumeStats volumes={volumes} totalStats={totalStats} />}
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