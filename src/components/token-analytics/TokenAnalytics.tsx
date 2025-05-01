'use client';

import { useState, useEffect, useRef } from 'react';
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
    volumeMap[swap.senderToken] = (volumeMap[swap.senderToken] || 0) + parseFloat(swap.senderAmountUSD);
  });
  return Object.entries(volumeMap)
    .map(([token, volumeUSD]) => ({ token, volumeUSD }))
    .sort((a, b) => b.volumeUSD - a.volumeUSD);
}

function aggregateTokenPairVolumes(swaps: Swap[]): TokenPairVolume[] {
  const pairMap: Record<string, number> = {};
  swaps.forEach(swap => {
    const pair = [swap.senderToken, swap.signerToken].sort().join('-');
    pairMap[pair] = (pairMap[pair] || 0) + parseFloat(swap.senderAmountUSD);
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
  const [swapsByPeriod, setSwapsByPeriod] = useState<Record<PeriodLabel, Swap[]>>({ '24h': [], '7d': [], '30d': [] });
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodLabel>('24h');
  const [tokenMetaMap, setTokenMetaMap] = useState<Record<string, TokenMeta>>({});
  const [coingeckoMeta, setCoingeckoMeta] = useState<Record<string, TokenMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const coingeckoRequests = useRef<Record<string, boolean>>({});

  useEffect(() => {
    fetch('https://tokens.uniswap.org/')
      .then(res => res.json())
      .then(data => {
        if (data && data.tokens) {
          setTokenMetaMap(getTokenMetaMap(data.tokens));
        }
      })
      .catch(() => setTokenMetaMap({}));
  }, []);

  useEffect(() => {
    const fetchAllPeriods = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = Math.floor(Date.now() / 1000);
        const results: Record<PeriodLabel, Swap[]> = { '24h': [], '7d': [], '30d': [] };
        await Promise.all(PERIODS.map(async ({ label, seconds }) => {
          const since = now - seconds;
          const response = await secureRequest<TokenAnalyticsData>(
            TOKEN_ANALYTICS_SWAPS_QUERY,
            { timestamp: since }
          );
          if (!response.data || !('swapERC20S' in response.data)) {
            throw new Error('Invalid response data');
          }
          results[label as PeriodLabel] = (response.data as any).swapERC20S;
        }));
        setSwapsByPeriod(results);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        setLoading(false);
      }
    };
    fetchAllPeriods();
    const interval = setInterval(fetchAllPeriods, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchCoingeckoMeta = async (address: string) => {
    const lower = address.toLowerCase();
    if (coingeckoMeta[lower] || coingeckoRequests.current[lower]) return;
    coingeckoRequests.current[lower] = true;
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${lower}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.symbol && data.name) {
        setCoingeckoMeta(prev => ({
          ...prev,
          [lower]: {
            address: lower,
            symbol: data.symbol.toUpperCase(),
            name: data.name,
            logoURI: data.image?.small || data.image?.thumb || undefined,
          },
        }));
      }
    } catch {}
  };

  const swaps = swapsByPeriod[selectedPeriod];
  const topTokens = aggregateTokenVolumes(swaps).slice(0, 5);
  const topPairs = aggregateTokenPairVolumes(swaps).slice(0, 5);

  const renderToken = (address: string) => {
    const lower = address.toLowerCase();
    const uniswapMeta = tokenMetaMap[lower];
    const cgMeta = coingeckoMeta[lower];
    const meta = cgMeta || uniswapMeta;
    if (!uniswapMeta && !cgMeta) {
      fetchCoingeckoMeta(address);
    }
    let logo = cgMeta?.logoURI || uniswapMeta?.logoURI;
    if (meta) {
      return (
        <span className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={meta.symbol} className="w-5 h-5 rounded-full" />
          ) : (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-500">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="8" />
                <text x="8" y="12" textAnchor="middle" fontSize="8" fill="#fff">?</text>
              </svg>
            </span>
          )}
          <span className="font-medium">{meta.symbol}</span>
          <span className="text-gray-500 text-xs">{meta.name}</span>
        </span>
      );
    }
    return <span className="font-mono">{address}</span>;
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
              onClick={() => setSelectedPeriod(label as PeriodLabel)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="p-6">Loading token analytics...</div>
      ) : error ? (
        <div className="p-6 text-red-500">{error}</div>
      ) : !swaps.length ? (
        <div className="p-6">No swap data available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          {/* Top Tokens by Volume */}
          <div>
            <h3 className="text-base font-semibold mb-4">Top Tokens by Volume</h3>
            <div className="space-y-2">
              {topTokens.map((token) => (
                <div key={token.token} className="flex justify-between items-center px-2 py-1 hover:bg-gray-100 rounded">
                  {renderToken(token.token)}
                  <div className="text-right font-medium">${token.volumeUSD.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Top Token Pairs by Volume */}
          <div>
            <h3 className="text-base font-semibold mb-4">Top Token Pairs</h3>
            <div className="space-y-2">
              {topPairs.map((pair) => {
                const [tokenA, tokenB] = pair.pair.split('-');
                return (
                  <div key={pair.pair} className="flex justify-between items-center px-2 py-1 hover:bg-gray-100 rounded">
                    <span className="flex items-center gap-1">
                      {renderToken(tokenA)}<span>/</span>{renderToken(tokenB)}
                    </span>
                    <div className="text-right font-medium">${pair.volumeUSD.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
} 