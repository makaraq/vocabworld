// Deletes the 66 fake leaderboard users created for the #67 screenshot.
// Run AFTER you've taken the screenshots:  node cleanup-leaderboard-dummies.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
function parseEnv(p){const o={};for(const l of readFileSync(p,'utf8').split('\n')){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(!m)continue;let v=m[2];if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);o[m[1]]=v}return o}
const env = parseEnv('.env.local')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { ids } = JSON.parse(readFileSync('leaderboard-dummies.json', 'utf8'))
console.log(`Deleting ${ids.length} dummy users…`)
let ok = 0
for (const id of ids) {
  // remove dependent rows first in case FKs don't cascade
  await db.from('user_word_progress').delete().eq('user_id', id)
  await db.from('user_profiles').delete().eq('id', id)
  const { error } = await db.auth.admin.deleteUser(id)
  if (error) console.error(`  ❌ ${id}: ${error.message}`); else ok++
}
console.log(`✅ removed ${ok}/${ids.length} dummy users. Your real leaderboard is clean again.`)
console.log('   (The screenshots@sprind.uk account and its stats are untouched.)')
