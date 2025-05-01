import { gql } from 'graphql-request';

export const DAILY_VOLUME_QUERY = gql`
  query GetDailyData($timestamp: Int!) {
    dailies(
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
  query GetBigSwaps($timestamp24h: Int!, $timestamp7d: Int!, $timestamp30d: Int!, $minAmount: String!) {
    last24h: swapERC20S(
      first: 10,
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
      senderAmountUSD
      feeAmountUSD
    }
    last7d: swapERC20S(
      first: 10,
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
      senderAmountUSD
      feeAmountUSD
    }
    last30d: swapERC20S(
      first: 10,
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
      senderAmountUSD
      feeAmountUSD
    }
  }
`;

export const SERVERS_QUERY = gql`
  query GetServers {
    servers(first: 100) {
      id
      url
      protocols
      tokens
    }
  }
`;

export const TOKEN_ANALYTICS_SWAPS_QUERY = gql`
  query GetRecentSwaps($timestamp: Int!) {
    swapERC20S(
      first: 1000,
      where: { blockTimestamp_gt: $timestamp }
      orderBy: senderAmountUSD
      orderDirection: desc
    ) {
      id
      senderToken
      signerToken
      senderAmountUSD
      signerAmountUSD
      blockTimestamp
      transactionHash
      from
      to
    }
  }
`;