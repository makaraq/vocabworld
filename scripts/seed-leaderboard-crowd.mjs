/**
 * Seeds a crowd of 2000 synthetic leaderboard users.
 *
 *   node scripts/seed-leaderboard-crowd.mjs            # create the crowd
 *   node scripts/seed-leaderboard-crowd.mjs --update   # recut the curve for the existing crowd
 *   node scripts/seed-leaderboard-crowd.mjs --refresh  # only bump streak dates
 *   node scripts/seed-leaderboard-crowd.mjs --dry-run  # print the curve, touch nothing
 *
 * Shape of the crowd (built per learning language, so every language tab and
 * the global tab read the same way):
 *   - the top 1% sit at ~2,000,000 plays with a 39-day streak
 *   - plays then decay gradually, with per-row jitter, down to a few hundred
 *   - streaks decay along with the plays, 39 -> 1
 *   - 10% of the crowd is opted in to showing a name; the rest render as the
 *     anonymous "Learner #XXXX" label. Exactly 3 of every board's first 25
 *     rows carry a name, so the top of the list is never all-anonymous.
 *
 * Every id it creates is written to leaderboard-crowd.json; delete the crowd
 * again with scripts/cleanup-leaderboard-crowd.mjs.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')
const REFRESH_ONLY = process.argv.includes('--refresh')
const UPDATE_ONLY = process.argv.includes('--update')
const TOTAL = 2000
// Ceiling for the curve. No one is parked exactly on it: rank 1 lands on a
// random number just under 3M, so the top of the board never looks rounded.
const TOP_PLAYS = 3_000_000
const TOP_STREAK = 39
const NAMED_SHARE = 0.10
const NAMED_IN_FIRST_25 = 10
const LEDGER = 'leaderboard-crowd.json'
// `in` filters ride in the query string, and a few hundred UUIDs is already
// enough URL for the request to be dropped before PostgREST sees it.
const ID_CHUNK = 100
// Upserts travel in the POST body, so they can go in bigger batches.
const BATCH = 500

// Languages people actually learn in this app, weighted by how busy they are.
const LANGUAGES = [
  ['es', 14], ['en', 13], ['fr', 10], ['de', 9], ['it', 8], ['pt', 8],
  ['ja', 7], ['tr', 6], ['ko', 5], ['ru', 5], ['ar', 4], ['uk', 3],
  ['bn', 3], ['ca', 2], ['lv', 1],
]

// ---------------------------------------------------------------- randomness
let seed = 0x5eed1eaf
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
  return ((seed >>> 0) % 1_000_000) / 1_000_000
}
const between = (a, b) => a + rnd() * (b - a)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const chance = (p) => rnd() < p

// ------------------------------------------------------------------- handles
// Given names from many countries; the handle builder roughens them up with
// mixed caps, an occasional separator and a few digits so the list reads like
// real self-chosen usernames rather than a generated table.
const GIVEN = [
  'mehmet', 'elif', 'burak', 'zeynep', 'lucas', 'mateo', 'sofia', 'camila', 'diego', 'valentina',
  'hiroshi', 'yuki', 'haruto', 'sakura', 'minji', 'jisoo', 'seojun', 'haeun', 'wei', 'yanyan',
  'chen', 'li', 'anja', 'lukas', 'jonas', 'greta', 'matthias', 'lenny', 'pierre', 'chloe',
  'margaux', 'theo', 'giulia', 'matteo', 'francesca', 'lorenzo', 'joao', 'beatriz', 'tiago', 'ines',
  'ana', 'rafa', 'dmitri', 'svetlana', 'nikolai', 'olga', 'oleksii', 'daryna', 'taras', 'kateryna',
  'omar', 'layla', 'youssef', 'nour', 'karim', 'amina', 'rahul', 'priya', 'arjun', 'ananya',
  'rohan', 'ishita', 'tanvir', 'shreya', 'anders', 'freja', 'mikkel', 'sigrid', 'emil', 'ingrid',
  'noa', 'daan', 'sanne', 'ruben', 'mila', 'jan', 'kasia', 'piotr', 'agnieszka', 'tomasz',
  'nadia', 'samir', 'farah', 'hassan', 'ayse', 'emre', 'can', 'deniz', 'melis', 'kerem',
  'sven', 'elin', 'oskar', 'maja', 'nils', 'alma', 'pedro', 'marta', 'carlos', 'lucia',
  'andrea', 'pablo', 'nuno', 'vera', 'petra', 'filip', 'marek', 'zuzana', 'bogdan', 'ilona',
  'kofi', 'amara', 'chidi', 'zuri', 'thabo', 'naledi', 'siti', 'budi', 'dewi', 'ahmad',
  'minh', 'linh', 'trang', 'quan', 'somchai', 'nattha', 'ravi', 'mei', 'sanja', 'jozef',
]
const SURNAME_BITS = [
  'kaya', 'yilmaz', 'demir', 'silva', 'souza', 'rossi', 'conti', 'bauer', 'weber', 'schmidt',
  'dubois', 'laurent', 'tanaka', 'sato', 'kimura', 'kim', 'park', 'choi', 'wang', 'zhao',
  'ivanov', 'petrov', 'kovalenko', 'shevchenko', 'haddad', 'mansour', 'khan', 'patel', 'iyer', 'nguyen',
  'tran', 'larsen', 'hansen', 'virtanen', 'novak', 'kowalski', 'horvat', 'mendes', 'castro', 'reyes',
  'ortiz', 'moreno', 'okafor', 'mensah', 'mwangi', 'putra', 'wati', 'lim', 'tanjung', 'bakker',
]
const TAILS = ['x', 'xx', '_', '__', 'z', 'q', 'vw', '7', '77']
const SUFFIX_WORDS = ['learns', 'speaks', 'daily', 'vocab', 'words', 'study']

function handleFor() {
  const given = pick(GIVEN)
  const style = Math.floor(rnd() * 6)
  let base
  if (style === 0) base = given
  else if (style === 1) base = given + '_' + pick(SURNAME_BITS)
  else if (style === 2) base = given + pick(SURNAME_BITS)
  else if (style === 3) base = pick(SURNAME_BITS) + '_' + given
  else if (style === 4) base = given + '_' + pick(SUFFIX_WORDS)
  else base = given.slice(0, 3) + pick(SURNAME_BITS)

  // Caps randomness: all-lower, Capitalised, SHOUTED, or a mid-word capital.
  const caps = Math.floor(rnd() * 10)
  if (caps >= 4 && caps < 7) base = base[0].toUpperCase() + base.slice(1)
  else if (caps === 7) base = base.toUpperCase()
  else if (caps > 7) {
    const i = Math.max(1, Math.min(base.length - 1, Math.floor(rnd() * base.length)))
    base = base.slice(0, i) + base[i].toUpperCase() + base.slice(i + 1)
  }

  let out = base
  if (chance(0.45)) out += String(Math.floor(between(2, 99)))           // a couple of digits
  else if (chance(0.12)) out += String(Math.floor(between(1980, 2009))) // a birth year
  if (chance(0.18)) out += pick(TAILS)
  return out.replace(/\s+/g, '').slice(0, 24)
}

// ----------------------------------------------------------------- the curve
// One independent curve per language: rank 1 at TOP_PLAYS, the top 1% still
// within a whisker of it, then a jittered power decay down to the tail.
function buildGroup(lang, size) {
  // Each language gets its own ceiling a little way under TOP_PLAYS, and the
  // top 1% are scattered beneath that — so no two boards share a leader number
  // and nothing lands on a suspiciously round one.
  const groupTop = Math.round(TOP_PLAYS * between(0.93, 0.999))
  const topBand = Math.max(1, Math.round(size * 0.01))
  const floorPlays = Math.round(between(260, 900))
  const rows = []
  for (let i = 0; i < size; i++) {
    let plays
    if (i < topBand) {
      plays = Math.round(groupTop * between(0.93, 1))
    } else {
      const t = (i - topBand) / Math.max(1, size - topBand - 1)
      const decayed = groupTop * Math.pow(floorPlays / groupTop, Math.pow(t, 0.78))
      plays = Math.round(decayed * between(0.9, 1.08))
    }
    rows.push({ lang, plays: Math.min(groupTop, Math.max(40, plays)) })
  }
  rows.sort((a, b) => b.plays - a.plays)

  // Streaks follow the plays: 39 at the top, randomly easing down to 1.
  for (const row of rows) {
    const base = TOP_STREAK * Math.pow(row.plays / groupTop, 0.33)
    row.streak = Math.min(TOP_STREAK, Math.max(1, Math.round(base * between(0.78, 1.18))))
  }
  rows[0].streak = TOP_STREAK

  // Names: NAMED_IN_FIRST_25 of the first 25 rows, then fill the rest of the
  // group at random until the group hits NAMED_SHARE.
  const target = Math.round(size * NAMED_SHARE)
  const head = Math.min(25, size)
  const headPicks = new Set()
  while (headPicks.size < Math.min(NAMED_IN_FIRST_25, head)) headPicks.add(Math.floor(rnd() * head))
  for (const i of headPicks) rows[i].named = true
  let named = headPicks.size
  const tail = []
  for (let i = head; i < size; i++) tail.push(i)
  for (let i = tail.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [tail[i], tail[j]] = [tail[j], tail[i]]
  }
  for (const i of tail) {
    if (named >= target) break
    rows[i].named = true
    named++
  }

  for (const row of rows) row.handle = row.named ? handleFor() : null
  return rows
}

function buildCrowd() {
  const weightTotal = LANGUAGES.reduce((sum, [, w]) => sum + w, 0)
  const crowd = []
  let assigned = 0
  LANGUAGES.forEach(([lang, weight], idx) => {
    const size = idx === LANGUAGES.length - 1
      ? TOTAL - assigned
      : Math.max(30, Math.round((weight / weightTotal) * TOTAL))
    assigned += size
    crowd.push(...buildGroup(lang, size))
  })
  crowd.sort((a, b) => b.plays - a.plays)

  fixGlobalHead(crowd)
  return crowd
}

// Merging the per-language groups dilutes the head, so re-fix the global first
// 25 at NAMED_IN_FIRST_25 and pay for it out of the tail, keeping the crowd as
// a whole near NAMED_SHARE. Expects `crowd` already sorted by plays, desc.
function fixGlobalHead(crowd) {
  const head = crowd.slice(0, 25)
  let headNamed = head.filter(r => r.named).length
  while (headNamed < NAMED_IN_FIRST_25) {
    const target = head.find(r => !r.named)
    if (!target) break
    target.named = true
    headNamed++
    const give = crowd.slice(25).reverse().find(r => r.named)
    if (give) give.named = false
  }
  while (headNamed > NAMED_IN_FIRST_25) {
    const target = head.slice().reverse().find(r => r.named)
    if (!target) break
    target.named = false
    headNamed--
    const take = crowd.slice(25).find(r => !r.named)
    if (take) take.named = true
  }
  for (const row of crowd) row.handle = row.named ? (row.handle ?? handleFor()) : null
}

// ------------------------------------------------------------------ plumbing
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

const todayUtc = new Date().toISOString().slice(0, 10)
const daysAgoIso = (d) => new Date(Date.now() - d * 86_400_000).toISOString()

async function mapLimit(items, limit, fn) {
  const out = []
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++
      out[idx] = await fn(items[idx], idx)
    }
  }))
  return out
}

async function main() {
  const crowd = buildCrowd()

  if (DRY_RUN) {
    console.log(`${crowd.length} synthetic learners`)
    const show = (i) => {
      const r = crowd[i]
      console.log(`  #${String(i + 1).padStart(4)}  ${String(r.plays).padStart(9)} plays  ${String(r.streak).padStart(2)}d  ${r.lang}  ${r.handle ?? '(anonymous)'}`)
    }
    for (let i = 0; i < 25; i++) show(i)
    console.log('   ...')
    for (const i of [100, 250, 500, 1000, 1500, 1999]) show(i)
    const named = crowd.filter(r => r.named).length
    console.log(`named: ${named} (${(named / crowd.length * 100).toFixed(1)}%), named in first 25: ${crowd.slice(0, 25).filter(r => r.named).length}`)
    return
  }

  const env = parseEnv('.env.local')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  if (REFRESH_ONLY) {
    if (!existsSync(LEDGER)) throw new Error(`${LEDGER} not found - nothing to refresh`)
    const { ids } = JSON.parse(readFileSync(LEDGER, 'utf8'))
    for (let i = 0; i < ids.length; i += ID_CHUNK) {
      const { error } = await db.from('user_login_streaks')
        .update({ last_login_date: todayUtc })
        .in('user_id', ids.slice(i, i + ID_CHUNK))
      if (error) console.error('  refresh failed:', error.message)
      process.stdout.write(`\r  refreshed ${Math.min(i + ID_CHUNK, ids.length)}/${ids.length}`)
    }
    console.log(`\n${ids.length} streak dates moved to ${todayUtc}`)
    return
  }

  if (UPDATE_ONLY) {
    if (!existsSync(LEDGER)) throw new Error(`${LEDGER} not found - nothing to update`)
    const { ids } = JSON.parse(readFileSync(LEDGER, 'utf8'))

    // Read the crowd back as it stands. Each learner keeps their language and
    // their two vocabulary rows, so re-cutting the curve only rewrites numbers
    // and names - it never strands a row or shifts anyone between boards.
    const existing = []
    for (let i = 0; i < ids.length; i += ID_CHUNK) {
      const { data, error } = await db
        .from('user_word_progress')
        .select('user_id, vocabulary_id, target_language_code, play_count')
        .in('user_id', ids.slice(i, i + ID_CHUNK))
        .order('user_id', { ascending: true })
      if (error) throw error
      existing.push(...data)
    }

    const byUser = new Map()
    for (const row of existing) {
      const entry = byUser.get(row.user_id) ?? { id: row.user_id, lang: row.target_language_code, rows: [], total: 0 }
      entry.rows.push(row)
      entry.total += row.play_count
      byUser.set(row.user_id, entry)
    }

    // Rebuild each language group at its real size and hand the new rows out
    // in the crowd's current order, so the board reshuffles as little as it can.
    const byLang = new Map()
    for (const person of byUser.values()) {
      if (!byLang.has(person.lang)) byLang.set(person.lang, [])
      byLang.get(person.lang).push(person)
    }

    const profiles = []
    const streaks = []
    const progress = []
    const assigned = []
    for (const [lang, people] of byLang) {
      people.sort((a, b) => b.total - a.total)
      const curve = buildGroup(lang, people.length)
      people.forEach((person, i) => {
        const cut = curve[i]
        const recent = Math.max(1, Math.round(cut.plays * between(0.012, 0.04)))
        const [bulkRow, recentRow] = person.rows
        progress.push({ ...bulkRow, play_count: cut.plays - recent })
        if (recentRow) progress.push({ ...recentRow, play_count: recent })
        profiles.push({ id: person.id, full_name: cut.handle, show_on_leaderboard: Boolean(cut.handle) })
        streaks.push({ user_id: person.id, current_streak: cut.streak, last_login_date: todayUtc })
        assigned.push({ ...cut, id: person.id })
      })
    }

    // Same dilution applies here: the per-language groups each fixed their own
    // first 25, which leaves the merged board's head short.
    assigned.sort((a, b) => b.plays - a.plays)
    fixGlobalHead(assigned)
    for (const cut of assigned) {
      const profile = profiles.find(pr => pr.id === cut.id)
      if (profile) {
        profile.full_name = cut.handle
        profile.show_on_leaderboard = Boolean(cut.handle)
      }
    }

    for (let i = 0; i < progress.length; i += BATCH) {
      const { error } = await db.from('user_word_progress')
        .upsert(progress.slice(i, i + BATCH), { onConflict: 'user_id,vocabulary_id,target_language_code' })
      if (error) console.error(`  user_word_progress failed: ${error.message}`)
      process.stdout.write(`
  plays ${Math.min(i + BATCH, progress.length)}/${progress.length}`)
    }
    console.log()
    // Profiles and streaks already exist, so update in place rather than
    // upserting half a row over the top of them.
    for (const [idx, row] of profiles.entries()) {
      const { error } = await db.from('user_profiles')
        .update({ full_name: row.full_name, show_on_leaderboard: row.show_on_leaderboard })
        .eq('id', row.id)
      if (error) console.error(`
  profile ${row.id}: ${error.message}`)
      if (idx % 200 === 0) process.stdout.write(`
  names ${idx}/${profiles.length}`)
    }
    console.log(`
  names ${profiles.length}/${profiles.length}`)
    for (const [idx, row] of streaks.entries()) {
      const { error } = await db.from('user_login_streaks')
        .update({ current_streak: row.current_streak, last_login_date: row.last_login_date })
        .eq('user_id', row.user_id)
      if (error) console.error(`
  streak ${row.user_id}: ${error.message}`)
      if (idx % 200 === 0) process.stdout.write(`
  streaks ${idx}/${streaks.length}`)
    }
    console.log(`
  streaks ${streaks.length}/${streaks.length}`)

    const named = assigned.filter(a => a.handle).length
    console.log(`
recut ${assigned.length} learners. Top: ${assigned[0].plays.toLocaleString('en-US')} plays, ${assigned[0].streak}-day streak.`)
    console.log(`  named: ${named} (${(named / assigned.length * 100).toFixed(1)}%), ${assigned.slice(0, 25).filter(a => a.handle).length} of the first 25`)
    return
  }

  const { data: vocab, error: vocabError } = await db.from('vocabulary').select('id').limit(1000)
  if (vocabError) throw vocabError
  const vocabIds = vocab.map(v => v.id)

  const stamp = Date.now().toString(36)
  console.log(`Creating ${crowd.length} auth users...`)
  let created = 0
  const results = await mapLimit(crowd, 8, async (person, idx) => {
    const email = `lb-${stamp}-${String(idx).padStart(4, '0')}@sprind-crowd.invalid`
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: `Crowd!${stamp}${idx}`,
      email_confirm: true,
      user_metadata: { leaderboard_crowd: true, full_name: person.handle ?? null },
    })
    if (error) {
      console.error(`\n  failed ${email}: ${error.message}`)
      return null
    }
    created++
    if (created % 50 === 0) process.stdout.write(`\r  created ${created}/${crowd.length}`)
    return { ...person, id: data.user.id, email }
  })
  console.log(`\r  created ${created}/${crowd.length}`)

  const people = results.filter(Boolean)
  writeFileSync(LEDGER, JSON.stringify({
    createdAt: new Date().toISOString(),
    stamp,
    ids: people.map(p => p.id),
  }, null, 2))
  console.log(`  ids written to ${LEDGER}`)

  // Profiles: a signup trigger may have created the row already, so upsert.
  const profiles = people.map(p => ({
    id: p.id,
    email: p.email,
    full_name: p.handle,
    avatar_url: null,
    timezone: 'UTC',
    show_on_leaderboard: Boolean(p.handle),
  }))
  const streaks = people.map(p => ({
    user_id: p.id,
    current_streak: p.streak,
    longest_streak: p.streak + Math.floor(between(0, 14)),
    last_login_date: todayUtc,
  }))

  // Two progress rows each: the bulk of the plays sits weeks back, plus a
  // small recent slice so the weekly board shows believable numbers.
  const progress = []
  for (const p of people) {
    const recent = Math.max(1, Math.round(p.plays * between(0.012, 0.04)))
    const ids = [pick(vocabIds), pick(vocabIds)]
    if (ids[0] === ids[1]) ids[1] = vocabIds[(vocabIds.indexOf(ids[0]) + 7) % vocabIds.length]
    progress.push({
      user_id: p.id, vocabulary_id: ids[0], target_language_code: p.lang,
      play_count: p.plays - recent,
      first_played_at: daysAgoIso(between(120, 400)),
      last_played_at: daysAgoIso(between(31, 110)),
    })
    progress.push({
      user_id: p.id, vocabulary_id: ids[1], target_language_code: p.lang,
      play_count: recent,
      first_played_at: daysAgoIso(between(31, 110)),
      last_played_at: daysAgoIso(chance(0.6) ? between(0, 5) : between(8, 30)),
    })
  }

  const push = async (table, rows, conflict) => {
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await db.from(table).upsert(rows.slice(i, i + BATCH), { onConflict: conflict })
      if (error) console.error(`  ${table} failed: ${error.message}`)
      process.stdout.write(`\r  ${table} ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
    }
    console.log()
  }
  await push('user_profiles', profiles, 'id')
  await push('user_login_streaks', streaks, 'user_id')
  await push('user_word_progress', progress, 'user_id,vocabulary_id,target_language_code')

  const namedCount = people.filter(p => p.handle).length
  console.log(`\n${people.length} learners on the board. Top: ${crowd[0].plays.toLocaleString('en-US')} plays, ${crowd[0].streak}-day streak.`)
  console.log(`  named: ${namedCount} (${(namedCount / people.length * 100).toFixed(1)}%)`)
  console.log('  streaks only read live while last_login_date is fresh - re-run with --refresh to bump it.')
  console.log('  remove them all: node scripts/cleanup-leaderboard-crowd.mjs')
}

main().catch(err => { console.error(err); process.exit(1) })
