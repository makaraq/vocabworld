// IndexedDB storage layer for offline language packs.
// Service workers / Cache API are unreliable inside Capacitor's WKWebView,
// so offline data (vocabulary JSON + audio blobs) lives in IndexedDB instead.

const DB_NAME = 'vw-offline'
const DB_VERSION = 1

// Object stores:
//  packs — one record per downloaded language pair (download state + stats)
//  data  — cached JSON API responses (vocabulary per topic, topics list, translations)
//  audio — audio blobs keyed `a:${languageCode}:${wordId}`
export const STORES = ['packs', 'data', 'audio'] as const
export type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

export function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('packs')) db.createObjectStore('packs', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('data')) db.createObjectStore('data', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio', { keyPath: 'key' })
    }
    req.onsuccess = () => {
      const db = req.result
      // If another tab/version needs to upgrade, don't hold the connection
      db.onversionchange = () => { db.close(); dbPromise = null }
      resolve(db)
    }
    req.onerror = () => { dbPromise = null; reject(req.error) }
    req.onblocked = () => { /* keep waiting; resolves when other tabs close */ }
  })
  return dbPromise
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbGet<T = any>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDb()
  return requestToPromise(db.transaction(store, 'readonly').objectStore(store).get(key))
}

export async function idbPut(store: StoreName, value: any): Promise<void> {
  const db = await openDb()
  await requestToPromise(db.transaction(store, 'readwrite').objectStore(store).put(value))
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
  const db = await openDb()
  await requestToPromise(db.transaction(store, 'readwrite').objectStore(store).delete(key))
}

export async function idbGetAll<T = any>(store: StoreName): Promise<T[]> {
  const db = await openDb()
  return requestToPromise(db.transaction(store, 'readonly').objectStore(store).getAll())
}

export async function idbGetAllKeys(store: StoreName): Promise<string[]> {
  const db = await openDb()
  const keys = await requestToPromise(db.transaction(store, 'readonly').objectStore(store).getAllKeys())
  return keys as string[]
}

// Delete every record whose key starts with `prefix` (uses a key range, so
// blobs are never loaded into memory).
export async function idbDeleteByPrefix(store: StoreName, prefix: string): Promise<number> {
  const db = await openDb()
  const range = IDBKeyRange.bound(prefix, prefix + '￿')
  const tx = db.transaction(store, 'readwrite')
  const os = tx.objectStore(store)
  let deleted = 0
  await new Promise<void>((resolve, reject) => {
    const cursorReq = os.openKeyCursor(range)
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (cursor) {
        os.delete(cursor.primaryKey)
        deleted++
        cursor.continue()
      } else {
        resolve()
      }
    }
    cursorReq.onerror = () => reject(cursorReq.error)
  })
  return deleted
}

export async function idbCountByPrefix(store: StoreName, prefix: string): Promise<number> {
  const db = await openDb()
  const range = IDBKeyRange.bound(prefix, prefix + '￿')
  return requestToPromise(db.transaction(store, 'readonly').objectStore(store).count(range))
}
