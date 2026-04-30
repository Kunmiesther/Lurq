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
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

const TIER = {
  conviction: {
    color: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
    border: 'rgba(16,185,129,0.3)',
    verdict: '⚡ APE IN',
    label: 'CONVICTION',
  },
  alert: {
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    verdict: '👀 MONITOR',
    label: 'ALERT',
  },
  watch: {
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.2)',
    verdict: '🚫 AVOID',
    label: 'WATCH',
  },
}

function getWatched(): string[] {
  try { return JSON.parse(localStorage.getItem('lurq_watched') || '[]') } catch { return [] }
}
function setWatched(list: string[]) {
  localStorage.setItem('lurq_watched', JSON.stringify(list))
}
function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

function SignalCard({ signal, prevTier }: { signal: Signal; prevTier?: string }) {
  const [copied, setCopied] = useState(false)
  const [watched, setWatchedState] = useState(false)
  const tier = signal.signal_tier.toLowerCase() as keyof typeof TIER
  const t = TIER[tier] || TIER.watch
  const isUp = signal.price_change_1h >= 0
  const priceStr = signal.price < 0.001 ? signal.price.toFixed(8) : signal.price.toFixed(4)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const list = JSON.parse(localStorage.getItem('lurq_watched') || '[]')
        setWatchedState(list.includes(signal.token_address))
      } catch { setWatchedState(false) }
    }, 0)
    return () => clearTimeout(timer)
  }, [signal.token_address])

  useEffect(() => {
    if (prevTier && prevTier !== signal.signal_tier) {
      sendNotification(
        `LURQ — ${signal.token_symbol} upgraded`,
        `${signal.token_symbol} moved to ${signal.signal_tier}. ${t.verdict}`
      )
    }
  }, [signal.token_address, signal.signal_tier, signal.token_symbol, prevTier, t.verdict])

  function copyAddr() {
    navigator.clipboard.writeText(signal.token_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function toggleWatch() {
    if (watched) {
      setWatched(getWatched().filter((a: string) => a !== signal.token_address))
      setWatchedState(false)
      return
    }
    if (!('Notification' in window)) { alert('Browser does not support notifications.'); return }
    if (Notification.permission === 'denied') {
      alert('Notifications blocked. Enable in browser settings then try again.')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setWatched([...getWatched(), signal.token_address])
      setWatchedState(true)
      new Notification('LURQ', { body: `Watching $${signal.token_symbol}. You'll be alerted on tier upgrades.` })
    } else {
      alert('Enable notifications in your browser settings to use Watch.')
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0d0d18 0%, #0a0a14 100%)',
      border: `1px solid ${t.border}`,
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      boxShadow: `0 0 30px ${t.glow}`,
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
    >
      {/* Glow accent top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: `linear-gradient(90deg, transparent, ${t.color}, transparent)`,
      }} />

      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
        background: t.color, borderRadius: '16px 0 0 16px',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', paddingLeft: '8px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '16px',
            color: '#f1f5f9',
            letterSpacing: '-0.3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {signal.token_name}
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#475569', marginTop: '2px' }}>
            ${signal.token_symbol} · {truncate(signal.token_address)}
          </div>
        </div>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '9px',
          letterSpacing: '2px',
          padding: '4px 10px',
          borderRadius: '20px',
          background: `${t.color}18`,
          color: t.color,
          border: `1px solid ${t.border}`,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {t.label}
        </div>
      </div>

      {/* Verdict — most prominent */}
      <div style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 800,
        fontSize: '18px',
        color: t.color,
        letterSpacing: '-0.5px',
        paddingLeft: '8px',
        textShadow: `0 0 20px ${t.color}60`,
      }}>
        {t.verdict}
      </div>

      {/* Price row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', paddingLeft: '8px' }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '22px',
          color: '#f1f5f9',
          letterSpacing: '-0.5px',
        }}>
          ${priceStr}
        </div>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '12px',
          fontWeight: 700,
          color: isUp ? '#10b981' : '#ef4444',
        }}>
          {isUp ? '+' : ''}{signal.price_change_1h?.toFixed(2)}%
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', paddingLeft: '8px' }}>
        {[
          { label: 'Buy/Sell', val: `${signal.buy_sell_ratio?.toFixed(1)}x`, col: '#22d3ee' },
          { label: 'Wallets', val: String(signal.smart_wallet_count), col: '#e2e8f0' },
          { label: 'Holders', val: signal.holder_count?.toLocaleString(), col: '#e2e8f0' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            padding: '8px',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              {m.label}
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: m.col }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>

      {/* Confidence bar */}
      <div style={{ paddingLeft: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}>Confidence</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: t.color }}>{Math.round(signal.confidence_score)}%</span>
        </div>
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${signal.confidence_score}%`,
            background: `linear-gradient(90deg, #7c3aed, ${t.color})`,
            borderRadius: '2px',
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {/* Time */}
      <div style={{ paddingLeft: '8px' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#334155' }}>
          detected {timeAgo(signal.detected_at)}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', paddingLeft: '8px' }}>
        <button onClick={copyAddr} style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '10px',
          padding: '8px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          flex: 1,
          background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
          color: copied ? '#10b981' : '#64748b',
          border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
          transition: 'all 0.2s',
          letterSpacing: '0.5px',
        }}>
          {copied ? '✓ COPIED' : '⎘ COPY'}
        </button>
        <a href={`https://birdeye.so/token/${signal.token_address}?chain=solana`}
          target="_blank" rel="noreferrer"
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '10px',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            flex: 1,
            textDecoration: 'none',
            textAlign: 'center',
            background: 'rgba(124,58,237,0.08)',
            color: '#a78bfa',
            border: '1px solid rgba(124,58,237,0.2)',
            letterSpacing: '0.5px',
          }}>
          ↗ BIRDEYE
        </a>
        <button onClick={toggleWatch} style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '10px',
          padding: '8px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          flex: 1,
          background: watched ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.03)',
          color: watched ? '#22d3ee' : '#64748b',
          border: `1px solid ${watched ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.06)'}`,
          transition: 'all 0.2s',
          letterSpacing: '0.5px',
        }}>
          {watched ? '🔔 ON' : '🔕 WATCH'}
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [prevSignals, setPrevSignals] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')

  const runScan = useCallback(async () => {
    try {
      setScanning(true)
      await fetch('/api/scan')
      const res = await fetch('/api/signals')
      const data = await res.json()
      const newSignals: Signal[] = data.signals || []
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
    const timeout = setTimeout(() => { runScan() }, 100)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [runScan])

  const conviction = signals.filter(s => s.signal_tier === 'CONVICTION')
  const alertSigs = signals.filter(s => s.signal_tier === 'ALERT')
  const watchSigs = signals.filter(s => s.signal_tier === 'WATCH')
  const sorted = [...conviction, ...alertSigs, ...watchSigs]
  const avgConf = signals.length ? Math.round(signals.reduce((a, s) => a + s.confidence_score, 0) / signals.length) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#050509', color: '#e2e8f0', fontFamily: "'Syne', sans-serif" }}>

      {/* FONTS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050509; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a12; }
        ::-webkit-scrollbar-thumb { background: #1e1e30; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)} }
        @keyframes scan-line { 0%{transform:translateY(-100%)}100%{transform:translateY(100vh)} }
        @keyframes ticker { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
        @keyframes glow-pulse { 0%,100%{opacity:0.4}50%{opacity:0.8} }
      `}</style>

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(5,5,9,0.85)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: scanning ? '#f59e0b' : '#10b981',
            boxShadow: `0 0 10px ${scanning ? '#f59e0b' : '#10b981'}`,
            animation: 'pulse 2s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '20px',
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #a78bfa 0%, #22d3ee 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            LURQ
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '9px',
            letterSpacing: '1.5px',
            color: scanning ? '#f59e0b' : '#10b981',
            textTransform: 'uppercase',
          }}>
            {scanning ? '⟳ scanning' : '● live'}
          </span>
          {lastUpdated && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#334155' }}>
              {lastUpdated}
            </span>
          )}
          <a href="https://t.me/lurqsignals" target="_blank" rel="noreferrer" style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.5px',
            color: '#22d3ee',
            border: '1px solid rgba(34,211,238,0.2)',
            padding: '6px 14px',
            borderRadius: '8px',
            background: 'rgba(34,211,238,0.06)',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}>
            JOIN TELEGRAM
          </a>
        </div>
      </header>

      {/* HERO */}
      <div style={{
        position: 'relative',
        padding: '80px 24px 60px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        {/* Background glow orb */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '400px',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, rgba(34,211,238,0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'glow-pulse 4s ease-in-out infinite',
        }} />

        {/* Scan line effect */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)',
          animation: 'scan-line 8s linear infinite',
          pointerEvents: 'none',
          opacity: 0.3,
        }} />

        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '10px',
          letterSpacing: '4px',
          color: '#7c3aed',
          textTransform: 'uppercase',
          marginBottom: '20px',
          opacity: 0.8,
        }}>
          — Solana Accumulation Radar
        </div>

        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(36px, 7vw, 72px)',
          letterSpacing: '-2px',
          lineHeight: 1,
          marginBottom: '16px',
          color: '#f1f5f9',
        }}>
          Everyone watches
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #22d3ee 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            the price.
          </span>
        </h1>

        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          fontSize: 'clamp(20px, 3vw, 32px)',
          letterSpacing: '-0.5px',
          color: 'rgba(241,245,249,0.5)',
          marginBottom: '40px',
        }}>
          We watch the wallets.
        </p>

        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '13px',
          color: '#475569',
          marginBottom: '48px',
          letterSpacing: '0.3px',
        }}>
          Detects silent accumulation before the move. Real-time. No noise.
        </p>

        {/* Stats bar */}
        <div style={{
          display: 'inline-grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          maxWidth: '600px',
          width: '100%',
        }}>
          {[
            { label: 'Active Signals', val: loading ? '—' : String(signals.length), col: '#a78bfa' },
            { label: 'Conviction', val: loading ? '—' : String(conviction.length), col: '#10b981' },
            { label: 'Wallets', val: loading ? '—' : String(signals.reduce((a, s) => a + s.smart_wallet_count, 0)), col: '#e2e8f0' },
            { label: 'Avg Conf', val: loading ? '—' : `${avgConf}%`, col: '#f59e0b' },
          ].map((s) => (
            <div key={s.label} style={{
              padding: '16px 12px',
              background: 'rgba(5,5,9,0.8)',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '8px',
                letterSpacing: '1px',
                color: '#334155',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: '22px',
                color: s.col,
                letterSpacing: '-0.5px',
              }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px 60px',
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '24px',
      }}
        className="main-grid"
      >
        <style>{`
          @media (max-width: 900px) {
            .main-grid { grid-template-columns: 1fr !important; }
            .sidebar { display: none !important; }
            .mobile-legend { display: flex !important; }
          }
          @media (min-width: 901px) {
            .mobile-legend { display: none !important; }
          }
        `}</style>

        {/* FEED COLUMN */}
        <div>
          {/* Mobile legend */}
          <div className="mobile-legend" style={{
            display: 'none',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '20px',
          }}>
            {[
              { label: '🟢 CONVICTION', desc: 'APE IN — all signals aligned, act now.', col: '#10b981' },
              { label: '🟡 ALERT', desc: 'MONITOR — building, wait for confirmation.', col: '#f59e0b' },
              { label: '🔴 WATCH', desc: 'AVOID — mixed signals, stay out.', col: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px', padding: '8px 12px',
              }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, color: s.col, whiteSpace: 'nowrap' }}>{s.label}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#475569' }}>{s.desc}</span>
              </div>
            ))}
          </div>

          {/* Section label */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '10px',
              letterSpacing: '2px',
              color: '#475569',
              textTransform: 'uppercase',
            }}>
              Signal Feed
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '9px',
              color: '#334155',
            }}>
              {sorted.length} active
            </span>
          </div>

          {/* Signal grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '14px',
          }}>
            {loading && (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '80px 0',
                fontFamily: "'Space Mono', monospace",
                fontSize: '12px',
                color: '#334155',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }}>⟳</div>
                Scanning wallets...
              </div>
            )}
            {!loading && signals.length === 0 && (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '80px 0',
                fontFamily: "'Space Mono', monospace",
                fontSize: '12px',
                color: '#334155',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>📡</div>
                No signals detected yet. Scanner running every 5 minutes...
              </div>
            )}
            {sorted.map(s => (
              <SignalCard key={s.id} signal={s} prevTier={prevSignals[s.token_address]} />
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Signal legend */}
          <div style={{
            background: 'linear-gradient(135deg, #0d0d18, #0a0a14)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '20px',
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '9px',
              letterSpacing: '2px',
              color: '#475569',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              Signal Guide
            </div>
            {[
              { label: 'CONVICTION', verdict: '⚡ APE IN', desc: 'All signals aligned. Price flat. Wallets loading. This is the window.', col: '#10b981' },
              { label: 'ALERT', verdict: '👀 MONITOR', desc: 'Pattern building. Wait for full confirmation before entry.', col: '#f59e0b' },
              { label: 'WATCH', verdict: '🚫 AVOID', desc: 'Mixed signals. Not enough confirmation. Stay out.', col: '#ef4444' },
            ].map((s, i) => (
              <div key={s.label} style={{
                paddingTop: i > 0 ? '14px' : 0,
                marginTop: i > 0 ? '14px' : 0,
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.col, boxShadow: `0 0 6px ${s.col}`, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: s.col }}>{s.label}</span>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 700, color: s.col, marginLeft: 'auto' }}>{s.verdict}</span>
                </div>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#475569', lineHeight: 1.6, paddingLeft: '14px' }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Telegram panel */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(124,58,237,0.06))',
            border: '1px solid rgba(34,211,238,0.15)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: '16px',
              color: '#f1f5f9',
              marginBottom: '8px',
              letterSpacing: '-0.3px',
            }}>
              Never Miss a Signal
            </div>
            <p style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '10px',
              color: '#475569',
              lineHeight: 1.7,
              marginBottom: '16px',
            }}>
              Every signal drops to Telegram with a full AI breakdown. No dashboard required.
            </p>
            <a href="https://t.me/lurqsignals" target="_blank" rel="noreferrer" style={{
              display: 'block',
              fontFamily: "'Space Mono', monospace",
              fontSize: '11px',
              letterSpacing: '0.5px',
              color: '#22d3ee',
              background: 'rgba(34,211,238,0.08)',
              border: '1px solid rgba(34,211,238,0.25)',
              borderRadius: '10px',
              padding: '12px',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}>
              JOIN @LURQSIGNALS →
            </a>
          </div>

          {/* Built with */}
          <div style={{
            background: 'linear-gradient(135deg, #0d0d18, #0a0a14)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '20px',
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '9px',
              letterSpacing: '2px',
              color: '#475569',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}>
              Powered by
            </div>
            {[
              { name: 'Birdeye Data API', desc: 'On-chain transaction analysis', col: '#10b981' },
              { name: 'DexScreener', desc: 'New token discovery', col: '#22d3ee' },
              { name: 'Claude AI', desc: 'Signal intelligence', col: '#a78bfa' },
              { name: 'Supabase', desc: 'Signal storage', col: '#3ecf8e' },
            ].map(p => (
              <div key={p.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
              }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: p.col, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{p.name}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#334155' }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '14px',
          background: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          LURQ
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#1e293b', textAlign: 'center', flex: 1 }}>
          The price is flat. The smart money isn&apos;t. · Built with Birdeye Data API · Not financial advice.
        </div>
        <a href="https://x.com/kunmiii__" target="_blank" rel="noreferrer"
          style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#334155', textDecoration: 'none' }}>
          @kunmiii__
        </a>
      </div>

    </div>
  )
}