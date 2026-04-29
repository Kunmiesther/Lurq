import TelegramBot from 'node-telegram-bot-api'
import { getClaudeInsight } from './claude'

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
  CONVICTION: '4/4 signals confirmed. Wallets loading, buy pressure strong. This is the entry window.',
  ALERT: '3/4 signals confirmed. Pattern building but not fully there yet. Wait for confirmation.',
  WATCH: '2/4 signals confirmed. Mixed picture — not enough to act on. Stay out for now.',
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

  // Honest per-metric dots — green when genuinely good, red when genuinely bad
  const reasons: string[] = []

  if (signal.buy_sell_ratio >= 1.5)
    reasons.push(`🟢 Buy pressure: ${signal.buy_sell_ratio.toFixed(1)}x buys vs sells — strong demand`)
  else if (signal.buy_sell_ratio > 1.0)
    reasons.push(`🟡 Buy pressure: ${signal.buy_sell_ratio.toFixed(1)}x ratio — mild demand`)
  else
    reasons.push(`🔴 Sell pressure dominant: ${signal.buy_sell_ratio.toFixed(1)}x — distribution likely`)

  if (signal.smart_wallet_count >= 10)
    reasons.push(`🟢 ${signal.smart_wallet_count} wallets entering — broad accumulation`)
  else if (signal.smart_wallet_count >= 5)
    reasons.push(`🟡 ${signal.smart_wallet_count} wallets detected — early accumulation`)
  else
    reasons.push(`🔴 Only ${signal.smart_wallet_count} wallets — very thin activity`)

  if (signal.price_change_1h > 50)
    reasons.push(`🟡 Price up ${signal.price_change_1h.toFixed(0)}% — already moving, entry window narrowing`)
  else if (signal.price_change_1h > 0)
    reasons.push(`🟢 Price up ${signal.price_change_1h.toFixed(2)}% — positive momentum`)
  else if (signal.price_change_1h > -20)
    reasons.push(`🟡 Price ${signal.price_change_1h.toFixed(2)}% — slight pullback, watch for recovery`)
  else
    reasons.push(`🔴 Price down ${signal.price_change_1h.toFixed(2)}% — dumping hard, avoid`)

  // Add verdict context only for WATCH to explain why despite any green flags
  if (signal.signal_tier === 'WATCH') {
    reasons.push(`🔴 Not enough signals aligned — wait for more confirmation`)
  }

  // Get Claude AI insight
  const aiInsight = await getClaudeInsight(signal)

  const closingLine = signal.signal_tier === 'CONVICTION'
    ? `_The price is flat. The smart money isn't. Move accordingly._`
    : signal.signal_tier === 'ALERT'
    ? `_Almost there. Watch for the next signal upgrade._`
    : `_Not every token is worth the risk. This one isn't ready._`

  const aiSection = aiInsight
    ? `\n🤖 *LURQ Intelligence:*\n${aiInsight}\n`
    : ''

  const message =
`LURQ
SIGNAL — ${emoji} ${signal.signal_tier}
${upgradeTag}

🏷 *${signal.token_name}* (${signal.token_symbol})
📍 Verdict: *${verdict}*

💡 *What this means:*
${meaning}
${aiSection}
📊 *Signal breakdown:*
${reasons.join('\n')}

💰 Price: $${signal.price?.toFixed(8)}
👥 Holders: ${signal.holder_count?.toLocaleString?.() ?? 'N/A'}
🎯 Confidence: ${signal.confidence_score?.toFixed(0)}%

⚠️ Not financial advice. DYOR.

🔗 [View on Birdeye](https://birdeye.so/token/${signal.token_address}?chain=solana)
📊 [Open LURQ Dashboard](https://lurq-sol.vercel.app)

\`${signal.token_address}\`

${closingLine}`

  await bot.sendMessage(CHANNEL, message, { parse_mode: 'Markdown' })
}