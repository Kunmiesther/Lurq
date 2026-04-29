# LURQ — Solana Accumulation Radar

> **Everyone watches the price. We watch the wallets.**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-lurq--sol.vercel.app-7c3aed?style=for-the-badge)](https://lurq-sol.vercel.app)
[![Telegram](https://img.shields.io/badge/📡_Telegram_Alerts-lurqsignals-22d3ee?style=for-the-badge)](https://t.me/lurqsignals)
[![Birdeye](https://img.shields.io/badge/Powered_by-Birdeye_Data_API-10b981?style=for-the-badge)](https://bds.birdeye.so)
[![Claude AI](https://img.shields.io/badge/AI_by-Claude_Haiku-a78bfa?style=for-the-badge)](https://anthropic.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

---

## What is LURQ?

LURQ is a real-time accumulation radar built for Solana degens.

It monitors newly launched Solana tokens and detects the quiet phase — when smart wallets are loading positions and the price hasn't moved yet. When the signals align, LURQ surfaces the token on a live dashboard, fires a Telegram alert, and gives you an AI-powered breakdown of exactly what the data means and what to do with it.

Most tools show you what already happened. LURQ shows you what's about to.

> *The price is flat. The smart money isn't.*

---

## The Problem

Every degen has been here. You check the chart. The token is already up 10x. Somewhere in the back of your head you think — I saw that token. The wallets that made money were already in hours ago. Quietly. No announcement. While the price was still flat and nobody was watching.

The tools available today don't solve this. They're either reactive (showing you what already happened), noisy (alerting on everything and meaning nothing), or incomplete (telling you when to enter but never when the signal shifts).

LURQ was built to fix that. It watches the accumulation phase on brand new Solana tokens in real time, runs a multi-signal check on each one, and tells you clearly whether to ape in, monitor, or avoid — with an AI breakdown explaining the reasoning in plain English.

---

## Signal Tiers

| Tier | Verdict | What it means |
|------|---------|----------------|
| 🟢 CONVICTION | ⚡ APE IN | 4/4 signals confirmed. Wallets loading, buy pressure strong, liquidity healthy. This is the entry window. |
| 🟡 ALERT | 👀 MONITOR — NOT YET | 3/4 signals confirmed. Pattern building but not fully there. Wait for confirmation before entry. |
| 🔴 WATCH | 🚫 AVOID FOR NOW | 2/4 signals confirmed. Mixed picture. Not enough to act on. Stay out for now. |

---

## How It Works

```
DexScreener API
  Discovers newly launched Solana tokens (under 24 hours old)
        ↓
Birdeye Data API
  Fetches transaction history for deeper buy/sell analysis
        ↓
LURQ Detector
  Runs 4-signal accumulation check per token
  Buy pressure — buys clearly outnumbering sells
  Wallet activity — multiple distinct wallets entering
  Liquidity health — enough depth to matter
  Price momentum — positive trend, not dumping
        ↓
Claude AI (Anthropic)
  Generates a plain-English insight specific to that
  token's exact numbers — not generic, not templated
        ↓
Supabase
  Stores signals, tracks tier upgrades over time
        ↓
Dashboard + Telegram
  Fires alert with verdict, breakdown, and AI insight
```

---

## Telegram Alerts

Every signal drops straight to Telegram — no dashboard required.

Each alert includes the signal tier and verdict, a plain-English explanation of what the pattern means, a per-metric breakdown with honest color coding, a Claude AI insight specific to that token's exact numbers, price, holders, confidence score, and direct links to Birdeye and the live dashboard.

Join the channel: [t.me/lurqsignals](https://t.me/lurqsignals)

---

## Dashboard Features

- Live signal feed — auto-refreshes every 5 minutes
- Signal legend — clear explanation of each tier on the page
- Verdict label — APE IN, MONITOR, or AVOID displayed prominently on every card
- Per-metric breakdown — buy pressure, wallet count, price momentum, confidence
- Copy address — one click to copy the contract
- View on Birdeye — direct link to full token data
- Watch button — browser notifications when a token you're tracking upgrades tiers
- Fully mobile responsive

---

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)
![Claude](https://img.shields.io/badge/Claude_AI-7c3aed?style=flat-square)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), TypeScript |
| Database | Supabase (PostgreSQL) |
| Token Discovery | DexScreener API |
| On-chain Analysis | Birdeye Data API |
| AI Signal Intelligence | Anthropic Claude Haiku |
| Alerts | Telegram Bot API |
| Deployment | Vercel |
| Background Scanning | cron-job.org (every 5 minutes) |

---

## Birdeye Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/defi/txs/token` | Transaction history for buy/sell signal analysis |
| `/defi/token_overview` | Price, holder count, volume data |
| `/defi/ohlcv` | Price candles for momentum detection |
| `/defi/tokenlist` | Fallback token discovery |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Birdeye Data API key — [bds.birdeye.so](https://bds.birdeye.so)
- Supabase account — [supabase.com](https://supabase.com)
- Anthropic API key — [console.anthropic.com](https://console.anthropic.com)
- Telegram bot — create via [@BotFather](https://t.me/BotFather)

### Installation

```bash
git clone https://github.com/Kunmiesther/lurq
cd lurq
npm install
```

### Environment Variables

Create `.env.local`:

```env
BIRDEYE_API_KEY=your_birdeye_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHANNEL_ID=@lurqsignals
ANTHROPIC_API_KEY=your_anthropic_key
```

### Database Setup

```sql
create table signals (
  id uuid default gen_random_uuid() primary key,
  token_address text not null,
  token_symbol text,
  token_name text,
  signal_tier text,
  price numeric,
  price_change_1h numeric,
  holder_count integer default 0,
  buy_sell_ratio numeric,
  smart_wallet_count integer,
  confidence_score numeric,
  detected_at timestamp default now(),
  is_active boolean default true
);

create table signal_history (
  id uuid default gen_random_uuid() primary key,
  signal_id uuid references signals(id),
  tier_from text,
  tier_to text,
  changed_at timestamp default now()
);

alter table signals enable row level security;
create policy "Allow public read on signals"
on signals for select using (true);
```

### Run Locally

```bash
npm run dev
```

---

## Project Structure

```
lurq/
├── app/
│   ├── page.tsx              # Main dashboard
│   ├── layout.tsx            # App shell
│   ├── globals.css           # Design tokens
│   └── api/
│       ├── scan/route.ts     # Scanner endpoint
│       └── signals/route.ts  # Signals feed
├── lib/
│   ├── birdeye.ts            # Birdeye Data API
│   ├── dexscreener.ts        # Token discovery
│   ├── detector.ts           # Signal logic
│   ├── claude.ts             # AI insight generation
│   └── telegram.ts           # Alert system
└── vercel.json               # Cron config
```

---

## Roadmap

- Smart wallet scoring — track historical win rate per wallet across previous tokens
- Exit signal alerts — notify when the wallets that triggered entry start distributing
- Wallet watchlist — add wallets you trust and get personalised signals when they move
- Multi-chain expansion — Base, BSC

---

## Disclaimer

LURQ is a data intelligence tool, not financial advice. All signals are algorithmic and based on on-chain data patterns. Always do your own research before making any trading decisions.

---

## Builder

Built by **Estar Kunmi** for the Birdeye Data BIP Hackathon — Sprint 2 (April 25 – May 2, 2026).

[![Twitter](https://img.shields.io/badge/Twitter-@kunmiii__-1DA1F2?style=flat-square&logo=twitter)](https://x.com/kunmiii__)
[![GitHub](https://img.shields.io/badge/GitHub-Kunmiesther-181717?style=flat-square&logo=github)](https://github.com/Kunmiesther)

---

*LURQ — The price is flat. The smart money isn't.*
