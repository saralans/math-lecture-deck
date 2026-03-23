import { LIBRARY_KEY, SUBJECTS } from './data.js'
import { supabase } from './auth.js'

// ── localStorage helpers (offline fallback) ───────────────────────────────

function localLoad() {
  try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]') } catch { return [] }
}

function localSave(entries) {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries)) } catch { /* quota exceeded */ }
}

// ── Row ↔ entry shape ─────────────────────────────────────────────────────

function buildEntry(deck, subject) {
  const subjectLabel = SUBJECTS[subject]?.label || subject || 'Math'
  const id = `${subject || 'math'}_${(deck.concept || '').replace(/\s+/g, '_').toLowerCase()}`
  return {
    id,
    savedAt:      new Date().toISOString(),
    concept:      deck.concept || 'Untitled',
    subject:      subject || 'real_analysis',
    subjectLabel,
    slideCount:   (deck.slides || []).length,
    textbook_ref: deck.textbook_ref || '',
    deck,
  }
}

function rowToEntry(row) {
  return {
    id:           row.id,
    savedAt:      row.saved_at,
    concept:      row.concept,
    subject:      row.subject,
    subjectLabel: SUBJECTS[row.subject]?.label || row.subject,
    slideCount:   row.slide_count,
    textbook_ref: row.textbook_ref || '',
    deck:         row.deck_json,
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export async function loadLibrary() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return localLoad()

  const { data, error } = await supabase
    .from('user_decks')
    .select('*')
    .order('saved_at', { ascending: false })

  if (error) return localLoad() // offline fallback

  // One-time migration: push any existing localStorage entries to Supabase
  const local = localLoad()
  if (local.length > 0) {
    const cloudIds = new Set(data.map(r => r.id))
    const toMigrate = local.filter(e => !cloudIds.has(e.id))
    if (toMigrate.length > 0) {
      const rows = toMigrate.map(e => ({
        id:           e.id,
        user_id:      session.user.id,
        subject:      e.subject,
        concept:      e.concept,
        deck_json:    e.deck,
        slide_count:  e.slideCount,
        textbook_ref: e.textbook_ref || null,
        saved_at:     e.savedAt,
      }))
      await supabase.from('user_decks').upsert(rows, { onConflict: 'user_id,id' })
    }
    localStorage.removeItem(LIBRARY_KEY)
    const { data: fresh } = await supabase
      .from('user_decks')
      .select('*')
      .order('saved_at', { ascending: false })
    return (fresh || data).map(rowToEntry)
  }

  return data.map(rowToEntry)
}

export async function saveToLibrary(deck, subject) {
  const entry = buildEntry(deck, subject)

  // Always keep localStorage in sync (instant UI, offline fallback)
  const local = localLoad()
  const filtered = local.filter(e => e.id !== entry.id)
  filtered.unshift(entry)
  localSave(filtered)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  await supabase.from('user_decks').upsert({
    id:           entry.id,
    user_id:      session.user.id,
    subject:      entry.subject,
    concept:      entry.concept,
    deck_json:    deck,
    slide_count:  entry.slideCount,
    textbook_ref: entry.textbook_ref || null,
    saved_at:     entry.savedAt,
  }, { onConflict: 'user_id,id' })
}

export async function deleteFromLibrary(id) {
  const local = localLoad()
  localSave(local.filter(e => e.id !== id))

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  await supabase.from('user_decks').delete().eq('id', id).eq('user_id', session.user.id)
}
