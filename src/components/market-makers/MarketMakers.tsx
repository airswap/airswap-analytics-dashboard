import { ServerData } from './types';
import { ChainIds, ProtocolIds, getAccountUrl } from '@airswap/utils';

export function MarketMakers({ servers }: { servers: ServerData[] }) {
  const getProtocolName = (protocolId: string) => {
    const normalizedId = protocolId.toLowerCase();
    const protocolName = Object.entries(ProtocolIds).find(
      ([_, value]) => value.toLowerCase() === normalizedId
    )?.[0];
    return protocolName || protocolId;
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
      <div className="px-4 py-3 border-b">
        <h2 className="text-xl font-bold">Market Makers</h2>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">URL</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Tokens</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Protocols</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {servers.map((server) => (
              <tr key={server.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  <a
                    href={getAccountUrl(ChainIds.MAINNET, server.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {server.id}
                  </a>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {server.tokens.length} tokens
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {server.protocols.map((protocol, index) => (
                      <span
                        key={`${server.id}-${protocol}-${index}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {getProtocolName(protocol)}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}