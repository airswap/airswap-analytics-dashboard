import { secureRequest } from '@/lib/utils';
import { gql } from 'graphql-request';

export const DAILY_VOLUME_QUERY = gql`
  query GetDailyData($timestamp: Int!, $skip: Int!) {
    dailies(
      first: 1000,
      skip: $skip,
      where: { date_gte: $timestamp }
      orderBy: date
      orderDirection: desc
    ) {
      date
      fees
      volume
    }
  }
`;

export const BIGGEST_SWAPS_QUERY = gql`
  query GetBigSwaps($timestamp24h: Int!, $timestamp7d: Int!, $timestamp30d: Int!, $minAmount: String!, $skip: Int!) {
    last24h: swapERC20S(
      first: 50,
      skip: $skip,
      where: { 
        blockTimestamp_gt: $timestamp24h,
        senderAmountUSD_gt: $minAmount
      },
      orderBy: senderAmountUSD,
      orderDirection: desc
    ) {
      id
      blockTimestamp
      transactionHash
      senderToken
      signerToken
      senderAmountUSD
      signerAmountUSD
      feeAmountUSD
    }
    last7d: swapERC20S(
      first: 50,
      skip: $skip,
      where: { 
        blockTimestamp_gt: $timestamp7d,
        senderAmountUSD_gt: $minAmount
      },
      orderBy: senderAmountUSD,
      orderDirection: desc
    ) {
      id
      blockTimestamp
      transactionHash
      senderToken
      signerToken
      senderAmountUSD
      signerAmountUSD
      feeAmountUSD
    }
    last30d: swapERC20S(
      first: 50,
      skip: $skip,
      where: { 
        blockTimestamp_gt: $timestamp30d,
        senderAmountUSD_gt: $minAmount
      },
      orderBy: senderAmountUSD,
      orderDirection: desc
    ) {
      id
      blockTimestamp
      transactionHash
      senderToken
      signerToken
      senderAmountUSD
      signerAmountUSD
      feeAmountUSD
    }
  }
`;

export const SERVERS_QUERY = gql`
  query GetServers {
    servers(first: 50) {
      id
      url
      protocols
      tokens
    }
  }
`;

export const TOKEN_ANALYTICS_SWAPS_QUERY = gql`
  query GetRecentSwaps($timestamp: Int!, $skip: Int!) {
    swapERC20S(
      first: 1000,
      skip: $skip,
      where: { blockTimestamp_gte: $timestamp }
      orderBy: senderAmountUSD
      orderDirection: desc
    ) {
      id
      senderToken
      signerToken
      senderAmount
      signerAmount
      senderAmountUSD
      signerAmountUSD
      blockTimestamp
      transactionHash
      from
      to
    }
  }
`;

export const TOTAL_STATS_QUERY = gql`
  query GetTotalStats {
    totals(first: 1) {
      id
      volume
      fees
    }
  }
`;

export const TOP_TOKENS_QUERY = gql`
  query GetTopTokens($timestamp: Int!, $skip: Int!) {
    swapERC20S(
      first: 500,
      skip: $skip,
      where: { blockTimestamp_gt: $timestamp }
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      senderToken
      signerToken
      senderAmountUSD
      signerAmountUSD
      blockTimestamp
    }
  }
`;

// Helper function to fetch all data using pagination
export async function fetchAllData<T>(
  query: string,
  variables: Record<string, any>,
  dataKey: string
): Promise<T[]> {
  let allData: T[] = [];
  let skip = 0;
  let hasMore = true;
  const pageSize = dataKey.includes('dailies') ? 1000 : 500;
  
  try {
    while (hasMore) {
      const response = await secureRequest<Record<string, any>>(
        query,
        { ...variables, skip }
      );

      if (!response.data) {
        console.error(`No data returned for ${dataKey}`, response);
        throw new Error(`No data returned for ${dataKey}`);
      }

      // Handle different response structures
      let newData: T[] = [];
      
      // Check if this is a direct response or nested
      if (dataKey.includes('last24h') || dataKey.includes('last7d') || dataKey.includes('last30d')) {
        // For nested queries in BIGGEST_SWAPS_QUERY
        newData = response.data[dataKey] || [];
      } else if (dataKey.includes('swaps_')) {
        // For token analytics queries
        newData = response.data.swapERC20S || [];
      } else if (dataKey === 'servers') {
        // For server queries
        newData = response.data.servers || [];
      } else if (dataKey === 'totals') {
        // For total stats queries
        newData = response.data.totals || [];
      } else {
        // Standard case
        newData = response.data[dataKey] || [];
      }

      if (Array.isArray(newData)) {
        allData = [...allData, ...newData];
      } else {
        console.warn(`Unexpected data format for ${dataKey}:`, newData);
        break;
      }

      // Check if we've reached the end
      hasMore = Array.isArray(newData) && newData.length === pageSize;
      skip += pageSize;
      
      // Safeguard against too many iterations
      if (allData.length > 5000) {
        console.warn(`Fetched over 5,000 records for ${dataKey}, limiting results.`);
        break;
      }
    }
    return allData;
  } catch (error) {
    console.error(`Error fetching data for ${dataKey}:`, error);
    return allData; // Return what we have so far
  }
}

// Helper function to batch requests
export async function batchRequests(
  requests: Array<{query: string, variables: Record<string, any>, dataKey: string}>,
): Promise<Record<string, any[]>> {
  const results: Record<string, any[]> = {};
  
  try {
    await Promise.all(
      requests.map(async ({ query, variables, dataKey }) => {
        try {
          const data = await fetchAllData(query, variables, dataKey);
          results[dataKey] = data;
        } catch (error) {
          console.error(`Error in batch request for ${dataKey}:`, error);
          results[dataKey] = [];
        }
      })
    );
  } catch (error) {
    console.error('Batch request error:', error);
  }
  
  return results;
}