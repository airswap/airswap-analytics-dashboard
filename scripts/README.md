# AirSwap Dashboard Scripts

## Token Metadata Downloader

The `downloadTokenMetadata.js` script downloads token metadata from CoinGecko and saves it to the public directory for use in the dashboard. This approach:

1. Reduces API calls to CoinGecko, avoiding rate limiting
2. Improves performance by having token data readily available
3. Ensures consistent data across the application

### Usage

```bash
# Download token metadata (automatically runs before build)
npm run download-tokens

# Update token metadata manually
npm run update-tokens
```

### Output

The script creates two files:

- `public/tokenMetadata.json` - Full metadata for all tokens (~5,000+ tokens)
- `public/tokenMetadata.simple.json` - Simplified version with ~300 of the most important tokens

### Token Priority

The script prioritizes common tokens used in swaps, including:

- WETH, USDT, USDC, DAI, WBTC
- Major DeFi tokens (UNI, LINK, AAVE, etc.)

These tokens are always included in the simplified version, which helps reduce the initial load time while still covering the most commonly traded assets.

### Updating Frequency

The token metadata is automatically updated during each build process. For production, consider setting up a cron job to update the token metadata weekly.
