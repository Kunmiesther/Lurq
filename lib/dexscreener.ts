export interface DexToken {
  address: string
  symbol: string
  name: string
  price: number
  priceChange1h: number
  volume24h: number
  liquidity: number
  pairCreatedAt: number
  buys: number
  sells: number
  txns: number
}

export async function getNewSolanaTokens(): Promise<DexToken[]> {
  const results: Map<string, DexToken> = new Map()

  // These endpoints return newest pairs directly
  const endpoints = [
    'https://api.dexscreener.com/latest/dex/tokens/solana',
    'https://api.dexscreener.com/latest/dex/search?q=solana+new',
    'https://api.dexscreener.com/latest/dex/search?q=pumpfun',
    'https://api.dexscreener.com/latest/dex/search?q=raydium+sol',
  ]

  const now = Date.now()
  // Accept tokens up to 24 hours old — filter by newest first
  const cutoff = now - 24 * 60 * 60 * 1000

  for (const endpoint of endpoints) {
    try {
      console.log('[DEXSCREENER] Trying:', endpoint)
      const res = await fetch(endpoint, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      })

      if (!res.ok) {
        console.log('[DEXSCREENER] Failed:', res.status, endpoint)
        continue
      }

      const data = await res.json()

      // Handle both array and object responses
      let pairs = []
      if (Array.isArray(data)) pairs = data
      else if (Array.isArray(data?.pairs)) pairs = data.pairs
      else if (Array.isArray(data?.data)) pairs = data.data

      console.log('[DEXSCREENER] Pairs from endpoint:', pairs.length)

      for (const p of pairs) {
        if (
          p.chainId !== 'solana' ||
          !p.baseToken?.address ||
          results.has(p.baseToken.address)
        ) continue

        // Skip stablecoins and wrapped assets
        const sym = (p.baseToken?.symbol || '').toUpperCase()
        if (['USDC', 'USDT', 'SOL', 'WSOL', 'WBTC', 'WETH', 'BTC', 'ETH'].includes(sym)) continue

        // Include if created within 24hrs OR if pairCreatedAt is missing (treat as new)
        const createdAt = p.pairCreatedAt ?? now
        if (createdAt < cutoff) continue

        const buys = p.txns?.h1?.buys ?? p.txns?.h24?.buys ?? 0
        const sells = p.txns?.h1?.sells ?? p.txns?.h24?.sells ?? 0

        results.set(p.baseToken.address, {
          address: p.baseToken.address,
          symbol: p.baseToken.symbol || '???',
          name: p.baseToken.name || p.baseToken.symbol || 'Unknown',
          price: parseFloat(p.priceUsd ?? '0'),
          priceChange1h: p.priceChange?.h1 ?? p.priceChange?.h6 ?? 0,
          volume24h: p.volume?.h24 ?? 0,
          liquidity: p.liquidity?.usd ?? 0,
          pairCreatedAt: createdAt,
          buys,
          sells,
          txns: buys + sells,
        })

        if (results.size >= 20) break
      }

      await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      console.log('[DEXSCREENER] Error on endpoint:', e)
    }
  }

  // Sort by newest first
  const sorted = Array.from(results.values())
    .sort((a, b) => b.pairCreatedAt - a.pairCreatedAt)
    .slice(0, 12)

  console.log('[DEXSCREENER] Total new Solana tokens:', sorted.length)
  sorted.forEach(t => {
    const ageMinutes = Math.floor((now - t.pairCreatedAt) / 60000)
    console.log(`  ${t.symbol} | age: ${ageMinutes}m | $${t.price} | liq: $${Math.floor(t.liquidity)} | ${t.buys}B/${t.sells}S`)
  })

  return sorted
}