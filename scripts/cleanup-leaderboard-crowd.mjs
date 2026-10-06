/**
 * Removes the synthetic leaderboard crowd created by seed-leaderboard-crowd.mjs.
 *
 *   node scripts/cleanup-leaderboard-crowd.mjs
 *
 * Only touches the ids recorded in leaderboard-crowd.json, so real accounts
 * (and the older screenshots dummies) are left alone.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function parseEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[m[1]] = v
  }
  return out
}

const env = parseEnv('.env.local')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { ids } = JSON.parse(readFileSync('leaderboard-crowd.json', 'utf8'))
console.log(`Deleting ${ids.length} synthetic learners...`)

// `in` filters ride in the query string, so keep the chunks small - a few
// hundred UUIDs is already enough URL for the request to be dropped in transit.
const ID_CHUNK = 100

// Dependent rows first, in case the FKs on this project do not cascade.
for (let i = 0; i < ids.length; i += ID_CHUNK) {
  const chunk = ids.slice(i, i + ID_CHUNK)
  for (const table of [
    ['user_word_progress', 'user_id'],
    ['user_login_streaks', 'user_id'],
    ['user_profiles', 'id'],
  ]) {
    const { error } = await db.from(table[0]).delete().in(table[1], chunk)
    if (error) console.error(`  ${table[0]}: ${error.message}`)
  }
  process.stdout.write(`\r  rows cleared ${Math.min(i + ID_CHUNK, ids.length)}/${ids.length}`)
}
console.log()

let ok = 0
let next = 0
await Promise.all(Array.from({ length: 8 }, async () => {
  while (next < ids.length) {
    const id = ids[next++]
    const { error } = await db.auth.admin.deleteUser(id)
    if (error) console.error(`\n  ${id}: ${error.message}`)
    else ok++
    if (ok % 100 === 0) process.stdout.write(`\r  auth users removed ${ok}/${ids.length}`)
  }
}))
console.log(`\nremoved ${ok}/${ids.length} synthetic learners. Real accounts untouched.`)
