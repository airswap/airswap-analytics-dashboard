export interface Swap {
  id: string;
  senderToken: string;
  signerToken: string;
  senderAmountUSD: string;
  signerAmountUSD: string;
  blockTimestamp: number;
  transactionHash: string;
  from: string;
  to: string;
}

export interface TokenVolume {
  token: string;
  volumeUSD: number;
}

export interface TokenPairVolume {
  pair: string;
  volumeUSD: number;
}

export interface TokenAnalyticsData {
  swaps: Swap[];
} 