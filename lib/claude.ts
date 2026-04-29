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
  liquidity?: number
}

export async function getClaudeInsight(signal: SignalData): Promise<string> {
  try {
    const prompt = `You are a sharp Solana trading analyst writing a 2-3 sentence signal insight for a degen trader. Be direct, specific, and use the actual numbers. No generic advice. No fluff. Tell them exactly what the data says and what it means for this specific token right now.

Token: ${signal.token_name} (${signal.token_symbol})
Signal tier: ${signal.signal_tier}
Price change (1h): ${signal.price_change_1h?.toFixed(2)}%
Buy/Sell ratio: ${signal.buy_sell_ratio?.toFixed(2)}x
Wallet count: ${signal.smart_wallet_count}
Holders: ${signal.holder_count}
Confidence: ${signal.confidence_score?.toFixed(0)}%
Current price: $${signal.price?.toFixed(8)}

Write 2-3 sentences. Start directly with the insight — no preamble like "This token" or "Based on the data". Be specific about the numbers. Tell the trader what this pattern means and what to watch for. Keep it under 60 words.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    })

    if (!response.ok) {
      console.error('[CLAUDE] API error:', response.status)
      return ''
    }

    const data = await response.json()
    const text = data?.content?.[0]?.text || ''
    console.log('[CLAUDE] Insight generated for', signal.token_symbol)
    return text.trim()
  } catch (e) {
    console.error('[CLAUDE] Error:', e)
    return ''
  }
}