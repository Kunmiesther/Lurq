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
  CONVICTION: '4/4 signals confirmed. Wallets loading, buy pressure strong, liquidity healthy. This is the entry window.',
  ALERT: '3/4 signals confirmed. Pattern building but not fully there. Wait for confirmation before entry.',
  WATCH: '2/4 signals confirmed. Mixed picture. Not enough to act on. Stay out for now.',
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

export async function sendTelegramAlert(signal: SignalData, isUpgrade: boolean, prevTier?: string) {
  const emoji = tierEmoji[signal.signal_tier]
  const verdict = tierVerdict[signal.signal_tier]
  const meaning = tierMeaning[signal.signal_tier]

  // Detect signal shift direction
  const isDowngrade = prevTier && (
    (prevTier === 'CONVICTION' && (signal.signal_tier === 'ALERT' || signal.signal_tier === 'WATCH')) ||
    (prevTier === 'ALERT' && signal.signal_tier === 'WATCH')
  )

  const upgradeTag = isDowngrade
    ? '⚠️ SIGNAL DOWNGRADED'
    : isUpgrade
    ? '⬆️ SIGNAL UPGRADED'
    : '🆕 NEW SIGNAL'

  const isPositive = signal.signal_tier === 'CONVICTION'

  const reasons: string[] = []

  if (signal.buy_sell_ratio >= 1.5)
    reasons.push(`${isPositive ? '🟢' : '🟡'} Buy pressure: ${signal.buy_sell_ratio.toFixed(1)}x buys vs sells`)
  else if (signal.buy_sell_ratio > 1.0)
    reasons.push(`🟡 Mild buy pressure: ${signal.buy_sell_ratio.toFixed(1)}x ratio`)
  else
    reasons.push(`🔴 Sell pressure dominant: ${signal.buy_sell_ratio.toFixed(1)}x ratio`)

  if (signal.smart_wallet_count >= 10)
    reasons.push(`${isPositive ? '🟢' : '🟡'} ${signal.smart_wallet_count} wallets entering position`)
  else if (signal.smart_wallet_count >= 5)
    reasons.push(`🟡 ${signal.smart_wallet_count} wallets detected`)
  else
    reasons.push(`🔴 Only ${signal.smart_wallet_count} wallets — thin activity`)

  if (signal.price_change_1h > 50)
    reasons.push(`🟡 Price up ${signal.price_change_1h.toFixed(0)}% — already moving, entry window narrowing`)
  else if (signal.price_change_1h > 0)
    reasons.push(`${isPositive ? '🟢' : '🟡'} Price up ${signal.price_change_1h.toFixed(2)}% — positive momentum`)
  else if (signal.price_change_1h > -20)
    reasons.push(`🟡 Price ${signal.price_change_1h.toFixed(2)}% — slight pullback`)
  else
    reasons.push(`🔴 Price down ${signal.price_change_1h.toFixed(2)}% — dumping hard`)

  if (signal.signal_tier === 'WATCH' && !isDowngrade) {
    reasons.push(`🔴 Overall: Too few signals aligned — not ready to act`)
  }

  // Get Claude AI insight
  const aiInsight = await getClaudeInsight(signal)
  const aiSection = aiInsight ? `\n🤖 *LURQ Intelligence:*\n${aiInsight}\n` : ''

  const closingLine = signal.signal_tier === 'CONVICTION'
    ? `_The price is flat. The smart money isn't. Move accordingly._`
    : signal.signal_tier === 'ALERT'
    ? `_Almost there. Watch for the next signal upgrade._`
    : `_Not every token is worth the risk. This one isn't ready._`

  // Special downgrade alert format
  if (isDowngrade) {
    const exitMessage =
`⚠️ *SMART MONEY EXITING*
Signal downgraded: ${prevTier} → ${signal.signal_tier}

🏷 *${signal.token_name}* ($${signal.token_symbol})
📍 Verdict: *🚫 GET OUT OR TIGHTEN STOP*

The same wallets that triggered entry are now distributing. This is your exit signal.

📊 *Current state:*
${reasons.join('\n')}
${aiSection}
💰 Price: $${signal.price?.toFixed(8)}
🎯 Confidence dropped to: ${signal.confidence_score?.toFixed(0)}%

🔗 [View on Birdeye](https://birdeye.so/token/${signal.token_address}?chain=solana)
📊 [Open LURQ Dashboard](https://lurq-sol.vercel.app)

\`${signal.token_address}\`

_Most tools tell you when to enter. LURQ tells you when to leave._`

    await bot.sendMessage(CHANNEL, exitMessage, { parse_mode: 'Markdown' })
    return
  }

  const message =
`LURQ
SIGNAL — ${emoji} ${signal.signal_tier}
${upgradeTag}

🏷 *${signal.token_name}* ($${signal.token_symbol})
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