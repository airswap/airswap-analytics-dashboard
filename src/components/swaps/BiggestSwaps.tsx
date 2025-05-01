import { SwapData } from './type';
import { formatUSD } from '@/lib/utils/format';
import { formatTimeAgo } from '@/lib/utils/date';

const PERIODS = [
  { label: '24h' },
  { label: '7d' },
  { label: '30d' },
];

type PeriodLabel = '24h' | '7d' | '30d';

interface BiggestSwapsProps {
  swaps: {
    '24h': SwapData[];
    '7d': SwapData[];
    '30d': SwapData[];
  };
  selectedTimeframe: PeriodLabel;
  onTimeframeChange: (timeframe: PeriodLabel) => void;
}

export function BiggestSwaps({ swaps, selectedTimeframe, onTimeframeChange }: BiggestSwapsProps) {
  const getSwapsForTimeframe = () => swaps?.[selectedTimeframe] || [];

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-xl font-bold">Top 10 Biggest Swaps ($50,000+)</h2>
        <div className="flex gap-2">
          {PERIODS.map(({ label }) => (
            <button
              key={label}
              className={`px-3 py-1 rounded font-medium border transition-colors text-sm ${selectedTimeframe === label ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => onTimeframeChange(label as PeriodLabel)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Transaction</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Amount (USD)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {getSwapsForTimeframe().map((swap) => (
              <tr key={swap.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  {formatTimeAgo(swap.blockTimestamp)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <a 
                    href={`https://etherscan.io/tx/${swap.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-mono"
                  >
                    {`${swap.transactionHash.slice(0, 6)}...${swap.transactionHash.slice(-4)}`}
                  </a>
                </td>
                <td className="px-4 py-3 text-sm text-right text-green-600">
                  {formatUSD(parseFloat(swap.senderAmountUSD))}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {formatUSD(parseFloat(swap.feeAmountUSD))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}