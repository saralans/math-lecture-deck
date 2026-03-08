import { LIBRARY_KEY, SUBJECTS } from './data.js'

export function loadLibrary() {
  try {
    return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveToLibrary(deck, subject) {
  const library = loadLibrary()
  const subjectLabel = SUBJECTS[subject]?.label || subject || 'Math'
  const id = `${subject || 'math'}_${(deck.concept || '').replace(/\s+/g, '_').toLowerCase()}`

  const entry = {
    id,
    savedAt: new Date().toISOString(),
    concept: deck.concept || 'Untitled',
    subject: subject || 'real_analysis',
    subjectLabel,
    slideCount: (deck.slides || []).length,
    textbook_ref: deck.textbook_ref || '',
    deck,
  }

  // Upsert: remove existing entry with same id, then prepend
  const filtered = library.filter(e => e.id !== id)
  filtered.unshift(entry)

  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(filtered))
  } catch (e) {
    // localStorage full — remove oldest entry and retry
    filtered.pop()
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(filtered))
  }
}

export function deleteFromLibrary(id) {
  const library = loadLibrary()
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library.filter(e => e.id !== id)))
}
