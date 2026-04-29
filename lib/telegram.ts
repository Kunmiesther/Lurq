import TelegramBot from 'node-telegram-bot-api'

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false })
const CHANNEL = process.env.TELEGRAM_CHANNEL_ID!

const tierEmoji: Record<string, string> = {
  CONVICTION: '🟢',
  ALERT: '🟡',
  WATCH: '🔴',
}

const tierVerdict: Record<string, string> = {
  CONVICTION: '⚡ APE IN',
  ALERT: '👀 MONITOR — NOT YET',
  WATCH: '🚫 AVOID FOR NOW',
}

const tierMeaning: Record<string, string> = {
  CONVICTION: '4/4 signals confirmed. Wallets loading, price flat, buy pressure rising. This is the entry window.',
  ALERT: '3/4 signals confirmed. Pattern building but not fully there yet. Wait for confirmation before entry.',
  WATCH: '2/4 signals confirmed. Mixed picture — one or two green flags but not enough to act. Stay out.',
}

interface SignalData {
  token_name: string
  token_symbol: string
  price: number
  price_change_1h: number
  buy_sell_ratio: number
  smart_wallet_count: number
  confidence_score: number
  token_address: string
  signal_tier: string
  holder_count: number
}

export async function sendTelegramAlert(signal: SignalData, isUpgrade: boolean) {
  const emoji = tierEmoji[signal.signal_tier]
  const verdict = tierVerdict[signal.signal_tier]
  const meaning = tierMeaning[signal.signal_tier]
  const upgradeTag = isUpgrade ? '⬆️ SIGNAL UPGRADED' : '🆕 NEW SIGNAL'

  // Verdict-aware dot — everything shown through the lens of the overall signal
  const dot = signal.signal_tier === 'CONVICTION' ? '🟢'
    : signal.signal_tier === 'ALERT' ? '🟡'
    : '🔴'

  // All reasons use the same dot as the verdict — no contradicting green on a red signal
  const reasons: string[] = []

  if (signal.buy_sell_ratio > 1.5)
    reasons.push(`${dot} Buy pressure: ${signal.buy_sell_ratio.toFixed(1)}x buys vs sells`)
  else if (signal.buy_sell_ratio > 1.0)
    reasons.push(`${dot} Mild buy pressure: ${signal.buy_sell_ratio.toFixed(1)}x ratio`)
  else
    reasons.push(`🔴 Sell pressure dominant: ${signal.buy_sell_ratio.toFixed(1)}x ratio`)

  if (signal.smart_wallet_count >= 10)
    reasons.push(`${dot} ${signal.smart_wallet_count} wallets entering position`)
  else if (signal.smart_wallet_count >= 3)
    reasons.push(`${dot} ${signal.smart_wallet_count} wallets detected`)
  else
    reasons.push(`🔴 Only ${signal.smart_wallet_count} wallet — thin activity`)

  if (Math.abs(signal.price_change_1h) < 3)
    reasons.push(`${dot} Price flat at ${signal.price_change_1h?.toFixed(2)}% — no hype yet`)
  else if (signal.price_change_1h > 0)
    reasons.push(`🔴 Price already moving +${signal.price_change_1h?.toFixed(2)}% — window may be closing`)
  else
    reasons.push(`🔴 Price dropping ${signal.price_change_1h?.toFixed(2)}% — caution`)

  const closingLine = signal.signal_tier === 'CONVICTION'
    ? `_The price is flat. The smart money isn't. Move accordingly._`
    : signal.signal_tier === 'ALERT'
    ? `_Almost there. Watch for the next signal upgrade._`
    : `_Not every token is worth the risk. This one isn't ready._`

  const message =
`LURQ
SIGNAL — ${emoji} ${signal.signal_tier}
${upgradeTag}

🏷 *${signal.token_name}* (${signal.token_symbol})
📍 Verdict: *${verdict}*

💡 *What this means:*
${meaning}

📊 *Signal breakdown:*
${reasons.join('\n')}

💰 Price: $${signal.price?.toFixed(8)}
👥 Holders: ${signal.holder_count?.toLocaleString?.() ?? 'N/A'}
🎯 Confidence: ${signal.confidence_score?.toFixed(0)}%

⚠️ Not financial advice. DYOR.

🔗 [View on Birdeye](https://birdeye.so/token/${signal.token_address}?chain=solana)
📊 [Open LURQ Dashboard](https://lurq.vercel.app)

\`${signal.token_address}\`

${closingLine}`

  await bot.sendMessage(CHANNEL, message, { parse_mode: 'Markdown' })
}