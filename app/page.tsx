'use client'

import { useEffect, useState, useCallback } from 'react'

type Signal = {
  id: string
  token_address: string
  token_symbol: string
  token_name: string
  signal_tier: string
  price: number
  price_change_1h: number
  holder_count: number
  buy_sell_ratio: number
  smart_wallet_count: number
  confidence_score: number
  detected_at: string
}

function truncate(addr: string) {
  return addr.slice(0, 4) + '...' + addr.slice(-4)
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

const TIER_CONFIG: Record<string, { color: string; verdict: string; verdictColor: string }> = {
  conviction: { color: '#10b981', verdict: '⚡ APE IN', verdictColor: '#10b981' },
  alert: { color: '#f59e0b', verdict: '👀 MONITOR', verdictColor: '#f59e0b' },
  watch: { color: '#ef4444', verdict: '🚫 AVOID FOR NOW', verdictColor: '#ef4444' },
}

function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

function getWatched(): string[] {
  try {
    return JSON.parse(localStorage.getItem('lurq_watched') || '[]')
  } catch {
    return []
  }
}

function setWatched(list: string[]) {
  localStorage.setItem('lurq_watched', JSON.stringify(list))
}

function SignalCard({ signal, prevTier }: { signal: Signal; prevTier?: string }) {
  const [copied, setCopied] = useState(false)
  const [watched, setWatchedState] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const list = JSON.parse(localStorage.getItem('lurq_watched') || '[]')
        setWatchedState(list.includes(signal.token_address))
      } catch {
        setWatchedState(false)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [signal.token_address])

  const tier = signal.signal_tier.toLowerCase()
  const isUp = signal.price_change_1h >= 0
  const config = TIER_CONFIG[tier] || TIER_CONFIG.watch
  const color = config.color

  useEffect(() => {
    // Fire notification if tier upgraded
    if (prevTier && prevTier !== signal.signal_tier) {
      sendNotification(
        `LURQ — ${signal.token_symbol} upgraded`,
        `${signal.token_symbol} moved from ${prevTier} → ${signal.signal_tier}. ${config.verdict}`
      )
    }
  }, [signal.token_address, signal.signal_tier, signal.token_symbol, prevTier, config.verdict])

  function copyAddr() {
    navigator.clipboard.writeText(signal.token_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function toggleWatch() {
    if (watched) {
      const list = getWatched()
      setWatched(list.filter((a: string) => a !== signal.token_address))
      setWatchedState(false)
      return
    }

    if (!('Notification' in window)) {
      alert('Your browser does not support notifications.')
      return
    }

    if (Notification.permission === 'denied') {
      alert(
        'Notifications are blocked for this site.\n\nTo enable:\n1. Click the lock icon in your browser address bar\n2. Set Notifications to "Allow"\n3. Refresh the page and try again.'
      )
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const list = getWatched()
        setWatched([...list, signal.token_address])
        setWatchedState(true)
        new Notification('LURQ', {
          body: `Now watching ${signal.token_symbol}. You'll be alerted on tier upgrades.`,
        })
      } else {
        alert(
          'Notification permission was not granted.\n\nClick the lock icon in your address bar to enable notifications for this site.'
        )
      }
    } catch {
      alert('Could not request notification permission. Please enable notifications manually in your browser settings.')
    }
  }

  const priceStr = signal.price < 0.001 ? signal.price.toFixed(8) : signal.price.toFixed(4)

  const metrics = [
    { label: 'Price', val: `$${priceStr}`, col: '#e2e8f0' },
    { label: '1h Change', val: `${isUp ? '+' : ''}${signal.price_change_1h?.toFixed(1)}%`, col: isUp ? '#10b981' : '#ef4444' },
    { label: 'Buy/Sell', val: `${signal.buy_sell_ratio?.toFixed(1)}x`, col: '#22d3ee' },
    { label: 'Smart Wallets', val: String(signal.smart_wallet_count), col: '#e2e8f0' },
    { label: 'Holders', val: signal.holder_count?.toLocaleString(), col: '#e2e8f0' },
    { label: 'Detected', val: timeAgo(signal.detected_at), col: '#475569' },
  ]

  return (
    <div style={{
      background: '#0f0f1a',
      border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {signal.token_name}{' '}
            <span style={{ color: '#475569', fontWeight: 400 }}>({signal.token_symbol})</span>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#475569', marginTop: '2px' }}>
            {truncate(signal.token_address)}
          </div>
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: '9px', letterSpacing: '1.5px',
          padding: '4px 10px', borderRadius: '20px', flexShrink: 0,
          background: `${color}15`, color, border: `1px solid ${color}44`,
        }}>
          {signal.signal_tier.toUpperCase()}
        </div>
      </div>

      {/* Verdict */}
      <div style={{
        fontFamily: 'monospace', fontSize: '12px', fontWeight: 700,
        color: config.verdictColor, letterSpacing: '0.5px',
        background: `${color}10`, borderRadius: '6px',
        padding: '6px 10px', textAlign: 'center',
        border: `1px solid ${color}22`,
      }}>
        {config.verdict}
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px', padding: '7px 8px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '8px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
              {m.label}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: m.col }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>

      {/* Confidence bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>
          Confidence
        </div>
        <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${signal.confidence_score}%`, background: `linear-gradient(90deg, #7c3aed, ${color})`, borderRadius: '2px' }} />
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#475569' }}>
          {Math.round(signal.confidence_score)}%
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button onClick={copyAddr} style={{
          fontFamily: 'monospace', fontSize: '10px', padding: '6px 10px',
          borderRadius: '6px', cursor: 'pointer', flex: 1,
          background: copied ? 'rgba(16,185,129,0.1)' : 'transparent',
          color: copied ? '#10b981' : '#64748b',
          border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : '#1a1a2e'}`,
          transition: 'all 0.2s',
        }}>
          {copied ? '✓ COPIED' : '⎘ COPY'}
        </button>
        <a href={`https://birdeye.so/token/${signal.token_address}?chain=solana`}
          target="_blank" rel="noreferrer"
          style={{
            fontFamily: 'monospace', fontSize: '10px', padding: '6px 10px',
            borderRadius: '6px', cursor: 'pointer', textDecoration: 'none', flex: 1,
            background: 'transparent', color: 'rgba(124,58,237,0.8)',
            border: '1px solid rgba(124,58,237,0.3)', textAlign: 'center',
          }}>
          ↗ BIRDEYE
        </a>
        <button onClick={toggleWatch} style={{
          fontFamily: 'monospace', fontSize: '10px', padding: '6px 10px',
          borderRadius: '6px', cursor: 'pointer', flex: 1,
          background: watched ? 'rgba(34,211,238,0.1)' : 'transparent',
          color: watched ? '#22d3ee' : '#64748b',
          border: `1px solid ${watched ? 'rgba(34,211,238,0.4)' : '#1a1a2e'}`,
          transition: 'all 0.2s',
        }}>
          {watched ? '🔔 WATCHING' : '🔕 WATCH'}
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [prevSignals, setPrevSignals] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')
  const [scanning, setScanning] = useState(false)

  const runScan = useCallback(async () => {
    try {
      setScanning(true)
      await fetch('/api/scan')
      const res = await fetch('/api/signals')
      const data = await res.json()
      const newSignals: Signal[] = data.signals || []

      // Track tier changes for notifications
      setPrevSignals(prev => {
        const updated: Record<string, string> = { ...prev }
        newSignals.forEach(s => { updated[s.token_address] = s.signal_tier })
        return updated
      })

      setSignals(newSignals)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setScanning(false)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(runScan, 300000)
    // Delay initial scan slightly to avoid synchronous setState
    const timeout = setTimeout(() => { runScan() }, 100)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [runScan])

  const conviction = signals.filter(s => s.signal_tier === 'CONVICTION')
  const alertSignals = signals.filter(s => s.signal_tier === 'ALERT')
  const watchSignals = signals.filter(s => s.signal_tier === 'WATCH')
  const avgConf = signals.length
    ? Math.round(signals.reduce((a, s) => a + s.confidence_score, 0) / signals.length)
    : 0
  const sorted = [...conviction, ...alertSignals, ...watchSignals]

  const statsItems = [
    { label: 'Active Signals', val: loading ? '—' : String(signals.length), col: '#a78bfa' },
    { label: 'Conviction', val: loading ? '—' : String(conviction.length), col: '#10b981' },
    { label: 'Wallets Tracked', val: loading ? '—' : String(signals.reduce((a, s) => a + s.smart_wallet_count, 0)), col: '#e2e8f0' },
    { label: 'Avg Confidence', val: loading ? '—' : `${avgConf}%`, col: '#f59e0b' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#04040a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(4,4,10,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #1a1a2e',
        padding: '0 16px', height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px',
          background: 'linear-gradient(135deg,#a78bfa,#22d3ee)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: scanning ? '#f59e0b' : '#10b981', boxShadow: `0 0 8px ${scanning ? '#f59e0b' : '#10b981'}`, flexShrink: 0 }} />
          LURQ
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {lastUpdated && (
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#475569', display: 'none' }}>
              {lastUpdated}
            </span>
          )}
          <span style={{ fontFamily: 'monospace', fontSize: '9px', color: scanning ? '#f59e0b' : '#10b981' }}>
            {scanning ? '⟳ SCANNING' : '● LIVE'}
          </span>
          <a href="https://t.me/lurqsignals" target="_blank" rel="noreferrer" style={{
            fontFamily: 'monospace', fontSize: '10px',
            color: '#22d3ee', border: '1px solid rgba(34,211,238,0.25)',
            padding: '5px 10px', borderRadius: '6px',
            background: 'rgba(34,211,238,0.06)', textDecoration: 'none',
          }}>
            JOIN TELEGRAM
          </a>
        </div>
      </header>

      {/* HERO */}
      <div style={{ padding: '24px 16px 16px', borderBottom: '1px solid #1a1a2e' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px', color: '#7c3aed', marginBottom: '8px' }}>
          — SOLANA ACCUMULATION RADAR
        </div>
        <div style={{ fontWeight: 800, fontSize: 'clamp(22px,5vw,40px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '8px' }}>
          Everyone watches the price.
          <br />
          <span style={{ background: 'linear-gradient(90deg,#7c3aed,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            We watch the wallets.
          </span>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
          Detects silent accumulation before the move. Real-time. No noise.
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #1a1a2e', overflowX: 'auto' }}>
        {statsItems.map((s, i) => (
          <div key={s.label} style={{ padding: '12px 16px', borderRight: i < 3 ? '1px solid #1a1a2e' : 'none', minWidth: '80px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '9px', letterSpacing: '1px', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
              {s.label}
            </div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: s.col }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      {/* SIGNAL LEGEND */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a2e', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { tier: '🟢 CONVICTION', desc: 'APE IN — wallets loading, price flat, act now.', col: '#10b981' },
          { tier: '🟡 ALERT', desc: 'MONITOR — smart money entering, wait for confirmation.', col: '#f59e0b' },
          { tier: '🔴 WATCH', desc: 'AVOID — too early, pattern unconfirmed.', col: '#ef4444' },
        ].map(s => (
          <div key={s.tier} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#0f0f1a', border: '1px solid #1a1a2e',
            borderRadius: '8px', padding: '6px 10px', flex: '1 1 auto',
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, color: s.col, whiteSpace: 'nowrap' }}>{s.tier}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#475569' }}>{s.desc}</span>
          </div>
        ))}
      </div>

      {/* SIGNAL GRID */}
      <div style={{
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '12px',
      }}>
        {loading && (
          <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569', gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0' }}>
            Scanning wallets...
          </div>
        )}
        {!loading && signals.length === 0 && (
          <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569', gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0' }}>
            No signals detected yet. Scanner running every 5 minutes...
          </div>
        )}
        {sorted.map(s => (
          <SignalCard
            key={s.id}
            signal={s}
            prevTier={prevSignals[s.token_address]}
          />
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #1a1a2e', padding: '16px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#475569' }}>
          LURQ — The price is flat. The smart money isn&apos;t. | Built with Birdeye Data API
        </div>
      </div>

    </div>
  )
}