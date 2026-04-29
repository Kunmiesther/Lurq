const BASE = 'https://public-api.birdeye.so'
const KEY = process.env.BIRDEYE_API_KEY

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function birdeyeFetch(path: string) {
  await delay(200)
  const url = `${BASE}${path}`

  const res = await fetch(url, {
    headers: {
      'X-API-KEY': KEY ?? '',
      'x-chain': 'solana',
      'accept': 'application/json',
    },
  })

  if (res.status === 429) {
    console.log('[BIRDEYE] Rate limited, waiting 5s...')
    await delay(5000)
    return null
  }

  if (!res.ok) {
    console.error('[BIRDEYE] Error:', res.status, path)
    return null
  }

  return res.json()
}


export async function getTokenOverview(address: string) {
  return birdeyeFetch(`/defi/token_overview?address=${address}`)
}

export async function getOHLCV(address: string) {
  return birdeyeFetch(`/defi/ohlcv?address=${address}&type=30m&limit=12`)
}

export async function getTokenTransactions(address: string) {
  return birdeyeFetch(`/defi/txs/token?address=${address}&limit=50&tx_type=swap`)
}