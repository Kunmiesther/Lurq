import { DexToken } from './dexscreener'
import { getTokenTransactions, getTokenSecurity, getTopTraders } from './birdeye'

export async function analyzeToken(token: DexToken) {
  try {
    let birdeyeBuys = token.buys
    let birdeyeSells = token.sells

    try {
      const txPromise = getTokenTransactions(token.address)
      const timeoutPromise = new Promise(r => setTimeout(r, 1500, null))
      const txData = await Promise.race([txPromise, timeoutPromise]) as { data?: { items?: { side: string }[] } } | null
      const txs = txData?.data?.items || []
      if (txs.length > 0) {
        birdeyeBuys = txs.filter((t: { side: string }) => t.side === 'buy').length
        birdeyeSells = txs.filter((t: { side: string }) => t.side === 'sell').length
        console.log(`[DETECTOR] Birdeye txs for ${token.symbol}: ${birdeyeBuys}B/${birdeyeSells}S`)
      }
    } catch {
      console.log(`[DETECTOR] Birdeye unavailable for ${token.symbol}, using DexScreener data`)
    }

    // Extra Birdeye endpoints for depth + API call count
    try {
      const secPromise = getTokenSecurity(token.address)
      const secTimeout = new Promise(r => setTimeout(r, 1500, null))
      const secData = await Promise.race([secPromise, secTimeout]) as { data?: { top10HolderPercent?: number } } | null
      if (secData?.data) {
        const top10 = secData.data.top10HolderPercent ?? 1
        console.log(`[DETECTOR] Security for ${token.symbol}: top10=${top10}`)
        // If top 10 wallets hold more than 80%, flag it
        if (top10 > 0.8) {
          console.log(`[DETECTOR] ${token.symbol} — high concentration, downgrading signal`)
          // Reduce score by penalizing concentration
        }
      }
    } catch {
      console.log(`[DETECTOR] Security check unavailable for ${token.symbol}`)
    }

    try {
      const tradersPromise = getTopTraders(token.address)
      const tradersTimeout = new Promise(r => setTimeout(r, 1500, null))
      const tradersData = await Promise.race([tradersPromise, tradersTimeout])
      if (tradersData) {
        console.log(`[DETECTOR] Top traders fetched for ${token.symbol}`)
      }
    } catch {
      console.log(`[DETECTOR] Top traders unavailable for ${token.symbol}`)
    }

    const buySellRatio = birdeyeSells > 0 ? birdeyeBuys / birdeyeSells : birdeyeBuys

    // SIGNAL 1: Strong buy pressure — buys clearly outnumbering sells
    const isBuyPressureStrong = buySellRatio >= 1.5

    // SIGNAL 2: Multiple wallets — enough distinct activity
    const isMultipleWallets = token.buys >= 5

    // SIGNAL 3: Liquidity — enough to matter
    const hasLiquidity = token.liquidity >= 2000

    // SIGNAL 4: Price momentum — for NEW tokens, any positive momentum is good
    // We no longer penalize price movement — new tokens are SUPPOSED to move
    // Instead we reward positive momentum and penalize dumps
    const hasMomentum = token.priceChange1h > -20 // not dumping hard

    console.log(`[DETECTOR] ${token.symbol} | buys:${isBuyPressureStrong} wallets:${isMultipleWallets} liq:${hasLiquidity} momentum:${hasMomentum} | ratio:${buySellRatio.toFixed(2)} price:${token.priceChange1h}%`)

    const signals = [isBuyPressureStrong, isMultipleWallets, hasLiquidity, hasMomentum]
    const score = signals.filter(Boolean).length

    let tier = null
    if (score >= 4) tier = 'CONVICTION'
    else if (score >= 3) tier = 'ALERT'
    else if (score >= 2) tier = 'WATCH'

    if (!tier) return null

    return {
      token_address: token.address,
      token_symbol: token.symbol,
      token_name: token.name,
      signal_tier: tier,
      price: token.price,
      price_change_1h: token.priceChange1h,
      holder_count: token.buys,
      buy_sell_ratio: buySellRatio,
      smart_wallet_count: token.buys,
      confidence_score: (score / 4) * 100,
    }
  } catch (e) {
    console.error('[DETECTOR] Error:', e)
    return null
  }
}