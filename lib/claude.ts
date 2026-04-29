interface SignalData {
  token_name: string
  token_symbol: string
  price: number
  price_change_1h: number
  buy_sell_ratio: number
  smart_wallet_count: number
  confidence_score: number
  signal_tier: string
  holder_count: number
}

export async function getClaudeInsight(signal: SignalData): Promise<string> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[CLAUDE] No API key found')
      return ''
    }

    console.log('[CLAUDE] Generating insight for', signal.token_symbol)

    const prompt = `You are a blunt Solana trading analyst. A new token just got flagged. Give a 2-3 sentence take on what the numbers mean for a degen trader right now. Use the actual numbers. No fluff. No generic advice. Be specific.

Token: ${signal.token_name} (${signal.token_symbol})
Verdict: ${signal.signal_tier}
1h price change: ${signal.price_change_1h?.toFixed(2)}%
Buy/Sell ratio: ${signal.buy_sell_ratio?.toFixed(2)}x
Wallets entering: ${signal.smart_wallet_count}
Holders: ${signal.holder_count}
Confidence: ${signal.confidence_score?.toFixed(0)}%
Price: $${signal.price?.toFixed(8)}

Be direct. Start with the most important thing a trader needs to know right now. Under 60 words.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const responseText = await response.text()
    console.log('[CLAUDE] Response status:', response.status)

    if (!response.ok) {
      console.error('[CLAUDE] API error:', response.status, responseText.slice(0, 200))
      return ''
    }

    const data = JSON.parse(responseText)
    const text = data?.content?.[0]?.text || ''
    console.log('[CLAUDE] Generated:', text.slice(0, 100))
    return text.trim()
  } catch (e) {
    console.error('[CLAUDE] Fatal error:', e)
    return ''
  }
}