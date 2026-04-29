import { DexToken } from './dexscreener'
import { getTokenTransactions } from './birdeye'

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

    const buySellRatio = birdeyeSells > 0 ? birdeyeBuys / birdeyeSells : birdeyeBuys
    const isPriceFlat = Math.abs(token.priceChange1h) < 10
    const isBuyPressureRising = buySellRatio > 1.2
    const isMultipleWallets = token.buys >= 3
    const hasLiquidity = token.liquidity > 1000

    console.log(`[DETECTOR] ${token.symbol} | flat:${isPriceFlat} buys:${isBuyPressureRising} wallets:${isMultipleWallets} liq:${hasLiquidity}`)

    const signals = [isPriceFlat, isBuyPressureRising, isMultipleWallets, hasLiquidity]
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