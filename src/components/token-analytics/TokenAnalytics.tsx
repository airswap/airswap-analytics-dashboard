'use client';

import { useState, useEffect } from 'react';
import { TokenAnalyticsData, Swap, TokenVolume, TokenPairVolume } from './types';
import { TOKEN_ANALYTICS_SWAPS_QUERY } from '@/app/api/graphql/queries';
import { secureRequest } from '@/lib/utils';

interface TokenMeta {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
}

function getTokenMetaMap(tokens: TokenMeta[]): Record<string, TokenMeta> {
  const map: Record<string, TokenMeta> = {};
  tokens.forEach(token => {
    map[token.address.toLowerCase()] = token;
  });
  return map;
}

function aggregateTokenVolumes(swaps: Swap[]): TokenVolume[] {
  const volumeMap: Record<string, number> = {};
  
  swaps.forEach(swap => {
    // Add sender token volume
    if (swap.senderToken && swap.senderAmountUSD) {
      volumeMap[swap.senderToken] = (volumeMap[swap.senderToken] || 0) + parseFloat(swap.senderAmountUSD);
    }
    
    // Add signer token volume
    if (swap.signerToken && swap.signerAmountUSD) {
      volumeMap[swap.signerToken] = (volumeMap[swap.signerToken] || 0) + parseFloat(swap.signerAmountUSD);
    }
  });
  
  return Object.entries(volumeMap)
    .map(([token, volumeUSD]) => ({ token, volumeUSD }))
    .sort((a, b) => b.volumeUSD - a.volumeUSD);
}

function aggregateTokenPairVolumes(swaps: Swap[]): TokenPairVolume[] {
  const pairMap: Record<string, number> = {};
  swaps.forEach(swap => {
    if (swap.senderToken && swap.signerToken && swap.senderAmountUSD) {
      const pair = [swap.senderToken, swap.signerToken].sort().join('-');
      pairMap[pair] = (pairMap[pair] || 0) + parseFloat(swap.senderAmountUSD);
    }
  });
  return Object.entries(pairMap)
    .map(([pair, volumeUSD]) => ({ pair, volumeUSD }))
    .sort((a, b) => b.volumeUSD - a.volumeUSD);
}

const PERIODS = [
  { label: '24h', seconds: 24 * 60 * 60 },
  { label: '7d', seconds: 7 * 24 * 60 * 60 },
  { label: '30d', seconds: 30 * 24 * 60 * 60 },
];

type PeriodLabel = '24h' | '7d' | '30d';

export function TokenAnalytics() {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodLabel>('24h');
  const [tokenMetaMap, setTokenMetaMap] = useState<Record<string, TokenMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load token metadata from local file
  useEffect(() => {
    fetch('/tokenMetadata.json')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setTokenMetaMap(data);
        }
      })
      .catch(err => {
        console.error('Error loading token metadata:', err);
      });
  }, []);

  // Fetch data for selected period
  const fetchSwapsForPeriod = async (periodLabel: PeriodLabel) => {
    setLoading(true);
    setError(null);
    
    try {
      const now = Math.floor(Date.now() / 1000);
      const periodInfo = PERIODS.find(p => p.label === periodLabel);
      
      if (!periodInfo) {
        throw new Error(`Invalid period: ${periodLabel}`);
      }
      
      const timestamp = now - periodInfo.seconds;
      const variables = { timestamp, skip: 0 };

      const response = await secureRequest<{swapERC20S: Swap[]}>(TOKEN_ANALYTICS_SWAPS_QUERY, variables);
      
      if (!response.data || !response.data.swapERC20S) {
        throw new Error('Invalid response from API');
      }
      
      setSwaps(response.data.swapERC20S);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setLoading(false);
    }
  };

  // Fetch data for initial period
  useEffect(() => {
    fetchSwapsForPeriod(selectedPeriod);
  }, []);

  // Handle period change
  const handlePeriodChange = (period: PeriodLabel) => {
    setSelectedPeriod(period);
    fetchSwapsForPeriod(period);
  };

  const topTokens = aggregateTokenVolumes(swaps).slice(0, 5);
  const topPairs = aggregateTokenPairVolumes(swaps).slice(0, 5);

  const renderToken = (address: string, showName = true) => {
    if (!address) return <span className="font-mono">Unknown</span>;
    
    const lower = address.toLowerCase();
    const meta = tokenMetaMap[lower];
    
    if (meta) {
      return (
        <span className="flex items-center gap-2">
          {meta.logoURI ? (
            <img src={meta.logoURI} alt={meta.symbol} className="w-5 h-5 rounded-full" />
          ) : (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-500">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="8" />
                <text x="8" y="12" textAnchor="middle" fontSize="8" fill="#fff">?</text>
              </svg>
            </span>
          )}
          <span className="font-medium">{meta.symbol}</span>
          {showName && <span className="text-gray-500 text-xs hidden sm:inline">{meta.name}</span>}
        </span>
      );
    }
    
    // If token not found in metadata, show shortened address
    return <span className="font-mono">{address.substring(0, 6)}...{address.substring(address.length - 4)}</span>;
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-xl font-bold">Token Analytics</h2>
        <div className="flex gap-2">
          {PERIODS.map(({ label }) => (
            <button
              key={label}
              className={`px-3 py-1 rounded font-medium border transition-colors text-sm ${selectedPeriod === label ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => handlePeriodChange(label as PeriodLabel)}
              disabled={loading}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="p-6">Loading token analytics for {selectedPeriod}...</div>
      ) : error ? (
        <div className="p-6 text-red-500">{error}</div>
      ) : !swaps.length ? (
        <div className="p-6">No swap data available for {selectedPeriod} period.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4" key={`period-${selectedPeriod}`}>
          {/* Top Tokens by Volume */}
          <div>
            <h3 className="text-base font-semibold mb-4">Top Tokens by Volume 
              <span className="inline-block ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {selectedPeriod}
              </span>
            </h3>
            <div className="space-y-2">
              {topTokens.length > 0 ? topTokens.map((token) => (
                <div key={token.token} className="flex justify-between items-center px-2 py-1 hover:bg-gray-100 rounded">
                  {renderToken(token.token)}
                  <div className="text-right font-medium">${token.volumeUSD.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                </div>
              )) : (
                <div className="px-2 py-1">No token data available</div>
              )}
            </div>
          </div>
          {/* Top Token Pairs by Volume */}
          <div>
            <h3 className="text-base font-semibold mb-4">Top Token Pairs
              <span className="inline-block ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {selectedPeriod}
              </span>
            </h3>
            <div className="space-y-2">
              {topPairs.length > 0 ? topPairs.map((pair) => {
                const [tokenA, tokenB] = pair.pair.split('-');
                return (
                  <div
                    key={pair.pair}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-2 py-1 hover:bg-gray-100 rounded"
                  >
                    <span className="flex items-center gap-1 text-sm sm:text-base">
                      {renderToken(tokenA, false)}<span>/</span>{renderToken(tokenB, false)}
                    </span>
                    <div className="text-right font-medium text-base sm:text-lg mt-1 sm:mt-0">
                      ${pair.volumeUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              }) : (
                <div className="px-2 py-1">No pair data available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
} 