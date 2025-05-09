import { VolumeData } from '@/components/volume/type';
import { formatUSD } from '@/lib/utils/format';

interface TotalStats {
  volume: string;
  fees: string;
}

interface VolumeStatsProps {
  volumes: VolumeData | null;
  totalStats?: TotalStats | null;
}

export function VolumeStats({ volumes, totalStats }: VolumeStatsProps) {
  if (!volumes) return null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {(Object.entries(volumes) as [keyof VolumeData, number][]).map(([period, amount]) => (
        <div key={period} className="bg-white rounded-lg p-4">
          <h2 className="text-lg text-gray-600">{period} Volume</h2>
          <p className="text-2xl font-bold text-black">
            {formatUSD(amount)}
          </p>
        </div>
      ))}
      
      {totalStats && (
        <div className="bg-white rounded-lg p-4">
          <h2 className="text-lg text-gray-600">V5 All-Time Stats</h2>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Total Volume:</span>
              <p className="text-xl font-bold text-black">
                {formatUSD(parseFloat(totalStats.volume))}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Total Fees:</span>
              <p className="text-xl font-bold text-black">
                {formatUSD(parseFloat(totalStats.fees))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
