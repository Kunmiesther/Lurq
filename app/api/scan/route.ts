import { NextResponse } from 'next/server'
import { getNewSolanaTokens } from '@/lib/dexscreener'
import { analyzeToken } from '@/lib/detector'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramAlert } from '@/lib/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface StoredSignal {
  id: string
  signal_tier: string
}

export async function GET() {
  try {
    console.log('[SCAN] Starting scan...')

    const tokens = await getNewSolanaTokens()

    if (tokens.length === 0) {
      console.log('[SCAN] No new tokens found')
      return NextResponse.json({ success: true, new_signals: 0 })
    }

    console.log('[SCAN] Analyzing', tokens.length, 'tokens...')
    let newSignalCount = 0

    const results = await Promise.allSettled(
      tokens.map(async (token) => {
        const signal = await analyzeToken(token)
        return { token, signal }
      })
    )

    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      const { token, signal } = result.value

      if (!signal) {
        console.log('[SCAN] No signal:', token.symbol)
        continue
      }

      console.log('[SCAN] Signal:', signal.token_symbol, signal.signal_tier)

      const { data: existing } = await supabase
        .from('signals')
        .select('id, signal_tier')
        .eq('token_address', token.address)
        .eq('is_active', true)
        .single<StoredSignal>()

      if (existing) {
        if (signal.signal_tier !== existing.signal_tier) {
          await supabase.from('signals').update(signal).eq('id', existing.id)
          await supabase.from('signal_history').insert({
            signal_id: existing.id,
            tier_from: existing.signal_tier,
            tier_to: signal.signal_tier,
          })
          🏷try {
            await sendTelegramAlert(signal, true, existing.signal_tier)
          } catch (tgErr) {
            console.log('[SCAN] Telegram alert failed (will work on Vercel):', tgErr)
          }
        }
      } else {
        const { data: inserted } = await supabase
          .from('signals')
          .insert(signal)
          .select()
          .single()

        if (inserted) {
          try {
            await sendTelegramAlert(signal, false)
          } catch (tgErr) {
            console.log('[SCAN] Telegram alert failed (will work on Vercel):', tgErr)
          }
        }
        newSignalCount++
      }
    }

    return NextResponse.json({ success: true, new_signals: newSignalCount })
  } catch (e) {
    console.error('[SCAN] Error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}