const fs = require('fs');
const path = require('path');
const https = require('https');

// Function to download a JSON file
async function downloadJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.error(`Error downloading from ${url}: Status ${res.statusCode}`);
        return reject(new Error(`Failed to download: ${res.statusCode}`));
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          reject(error);
        }
      });
    }).on('error', (err) => {
      console.error('Download error:', err);
      reject(err);
    });
  });
}

// Priority tokens that we definitely want to include in the simplified version
const PRIORITY_TOKENS = [
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
  '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
  '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f', // SNX
  '0xd533a949740bb3306d119cc777fa900ba034cd52', // CRV
];

async function main() {
  console.log('Downloading token metadata directly from CoinGecko...');
  
  try {
    // Instead of fetching from multiple sources, just fetch directly from CoinGecko's all.json
    console.log('Downloading from https://tokens.coingecko.com/ethereum/all.json...');
    const data = await downloadJSON('https://tokens.coingecko.com/ethereum/all.json');
    
    if (!data || !data.tokens || !Array.isArray(data.tokens)) {
      throw new Error('Invalid data format from CoinGecko');
    }
    
    const tokens = data.tokens;
    console.log(`Processing ${tokens.length} tokens from CoinGecko...`);
    
    // Process each token into our format
    const tokenMap = {};
    
    tokens.forEach(token => {
      if (token && token.address) {
        const address = token.address.toLowerCase();
        
        tokenMap[address] = {
          address,
          symbol: token.symbol,
          name: token.name,
          logoURI: token.logoURI || undefined,
        };
      }
    });
    
    // Create simplified version with only top tokens
    const simplifiedMap = {};
    
    // First add all priority tokens that exist in our data
    PRIORITY_TOKENS.forEach(address => {
      const lowerAddress = address.toLowerCase();
      if (tokenMap[lowerAddress]) {
        simplifiedMap[lowerAddress] = tokenMap[lowerAddress];
      }
    });
    
    // Then add a subset of the remaining tokens (up to 300 tokens total)
    const remainingTokens = Object.keys(tokenMap)
      .filter(address => !simplifiedMap[address])
      .slice(0, 300 - Object.keys(simplifiedMap).length);
    
    remainingTokens.forEach(address => {
      simplifiedMap[address] = tokenMap[address];
    });
    
    const tokenCount = Object.keys(tokenMap).length;
    const simplifiedCount = Object.keys(simplifiedMap).length;
    
    console.log(`Total unique tokens: ${tokenCount}`);
    console.log(`Simplified token count: ${simplifiedCount}`);
    
    // Write the metadata to a JSON file
    const outputPath = path.join(__dirname, '../public/tokenMetadata.json');
    fs.writeFileSync(outputPath, JSON.stringify(tokenMap, null, 2));
    console.log(`Token metadata saved to ${outputPath}`);
    
    // Write the simplified version
    const simplifiedPath = path.join(__dirname, '../public/tokenMetadata.simple.json');
    fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedMap, null, 2));
    console.log(`Simplified token metadata saved to ${simplifiedPath}`);
    
  } catch (error) {
    console.error('Error in download process:', error);
  }
}

main().catch(console.error); 