import { useCallback, useEffect, useState } from 'react'

// Picture coins: a quiz card can be flipped to show its word's illustration,
// and each flip costs a coin. Three a day; unspent coins don't carry over, so
// the wallet simply starts again on a new local day. A word bought today
// stays bought until midnight, so seeing it again costs nothing.
//
// Kept on the device (localStorage): it's a hint, not currency, and reading
// it must never wait on the network.

export const DAILY_PICTURE_COINS = 3

const KEY = 'sprind:picture-coins'

interface Wallet {
  day: string
  spent: number
  words: number[]
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const fresh = (): Wallet => ({ day: today(), spent: 0, words: [] })

function read(): Wallet {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (w && w.day === today() && typeof w.spent === 'number' && Array.isArray(w.words)) return w
  } catch {}
  return fresh()
}

function write(w: Wallet) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w))
  } catch {}
}

export function usePictureCoins() {
  const [wallet, setWallet] = useState<Wallet>(fresh)

  useEffect(() => {
    setWallet(read())
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setWallet(read()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const owns = useCallback((wordId: number) => wallet.day === today() && wallet.words.includes(wordId), [wallet])

  // Spends a coin on the word, unless it's already bought today. False when
  // there's no coin left.
  const buy = useCallback((wordId: number): boolean => {
    const w = read()
    if (w.words.includes(wordId)) return true
    if (w.spent >= DAILY_PICTURE_COINS) {
      setWallet(w)
      return false
    }
    const next = { ...w, spent: w.spent + 1, words: [...w.words, wordId] }
    write(next)
    setWallet(next)
    return true
  }, [])

  const left = wallet.day === today() ? Math.max(0, DAILY_PICTURE_COINS - wallet.spent) : DAILY_PICTURE_COINS
  return { left, total: DAILY_PICTURE_COINS, owns, buy }
}

export type PictureCoins = ReturnType<typeof usePictureCoins>
