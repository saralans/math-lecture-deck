import React, { useState, useRef } from 'react'
import { C, FONT, btn } from './styles.js'
import { SUBJECTS } from './data.js'
import { loadLibrary, deleteFromLibrary } from './library.js'

function LibraryPanel({ onLoad }) {
  const [library, setLibrary] = useState(() => loadLibrary())

  if (library.length === 0) return null

  const handleDelete = (id) => {
    deleteFromLibrary(id)
    setLibrary(loadLibrary())
  }

  const subjectColors = {
    real_analysis:          C.defGreen,
    calculus:               C.recallBlue,
    linear_algebra:         C.thmPurple,
    topology:               '#9a9a50',
    abstract_algebra:       '#6890c0',
    optimization:           C.exOrange,
    probability:            '#b06848',
    differential_equations: '#7a60b0',
  }

  return (
    <div style={{ marginTop: '28px' }}>
      <div style={{ fontSize: '11px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT.sans, fontWeight: '600', marginBottom: '12px' }}>
        Saved Decks
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {library.map(entry => {
          const color = subjectColors[entry.subject] || C.gold
          return (
            <div key={entry.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: C.text, fontFamily: FONT.serif, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.concept}
                  </span>
                  <span style={{ background: color + '20', color, fontSize: '10px', fontFamily: FONT.sans, fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '100px', border: `1px solid ${color}40`, flexShrink: 0 }}>
                    {entry.subjectLabel}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: C.muted, fontFamily: FONT.sans }}>
                  {entry.slideCount} slides · {new Date(entry.savedAt).toLocaleDateString()}
                  {entry.textbook_ref && ` · ${entry.textbook_ref}`}
                </div>
              </div>
              <button
                onClick={() => onLoad(entry.deck, entry.subject)}
                style={{ ...btn('outline'), fontSize: '12px', padding: '5px 12px', flexShrink: 0 }}
              >
                Load
              </button>
              <button
                onClick={() => handleDelete(entry.id)}
                style={{ ...btn('ghost'), fontSize: '12px', padding: '5px 10px', color: C.red, border: `1px solid ${C.red}30`, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SetupScreen({ user, onSignOut, onGenerate, onLoad, isLoading, progress, error }) {
  const [subject, setSubject] = useState('real_analysis')
  const [concept, setConcept] = useState('')
  const [context, setContext] = useState('')
  const importRef = useRef(null)

  const examples = SUBJECTS[subject]?.examples || []

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!concept.trim()) return
    onGenerate(concept.trim(), context.trim(), subject)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (!parsed.slides || !Array.isArray(parsed.slides)) {
          alert('Invalid deck JSON: missing slides array.')
          return
        }
        onLoad(parsed, parsed.subject || 'real_analysis')
      } catch {
        alert('Could not parse JSON file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const field = {
    width: '100%', background: C.surfaceLight,
    border: `1px solid ${C.border}`, borderRadius: '6px',
    padding: '11px 15px', color: C.text, fontSize: '16px',
    fontFamily: FONT.serif, boxSizing: 'border-box',
  }
  const lbl = {
    display: 'block', fontSize: '11px', color: C.muted,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    fontFamily: FONT.sans, fontWeight: '600', marginBottom: '7px',
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: '580px' }}>

        {/* User bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '13px', color: C.muted, fontFamily: FONT.sans }}>
            {user?.email || user?.user_metadata?.user_name || 'Signed in'}
          </span>
          <button onClick={onSignOut} style={{ ...btn('ghost'), fontSize: '12px', padding: '4px 10px' }}>
            Sign out
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div style={{ display: 'inline-block', border: `1px solid ${C.gold}40`, borderRadius: '100px', padding: '4px 14px', fontSize: '11px', color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: FONT.sans, marginBottom: '20px' }}>
            Math Lecture Decks
          </div>
          <h1 style={{ fontSize: '40px', fontWeight: '400', color: C.text, fontFamily: FONT.serif, margin: '0 0 14px', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
            Lecture Deck Generator
          </h1>
          <p style={{ fontSize: '16px', color: C.muted, fontFamily: FONT.serif, lineHeight: 1.65, margin: 0 }}>
            Transform any math concept into a structured academic slideshow — definitions, theorems, examples, and speaker scripts.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '16px' }}>

            <div>
              <label style={lbl}>Subject</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(SUBJECTS).map(([key, s]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setSubject(key); setConcept('') }}
                    disabled={isLoading}
                    style={{
                      background: subject === key ? C.gold + '20' : 'none',
                      border: `1px solid ${subject === key ? C.gold + '80' : C.border}`,
                      color: subject === key ? C.gold : C.muted,
                      cursor: 'pointer', fontSize: '12px', fontFamily: FONT.sans,
                      padding: '5px 12px', borderRadius: '100px', transition: 'all 0.15s',
                      fontWeight: subject === key ? '600' : '400',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={lbl}>{SUBJECTS[subject]?.label || 'Math'} Concept</label>
              <input
                type="text"
                value={concept}
                onChange={e => setConcept(e.target.value)}
                placeholder={`e.g. ${examples[0] || 'Enter a concept'}`}
                style={field}
                disabled={isLoading}
                required
              />
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {examples.map(ex => (
                  <button key={ex} type="button" onClick={() => setConcept(ex)} disabled={isLoading}
                    style={{ background: concept === ex ? C.gold + '20' : 'none', border: `1px solid ${concept === ex ? C.gold + '60' : C.border}`, color: concept === ex ? C.gold : C.muted, cursor: 'pointer', fontSize: '12px', fontFamily: FONT.sans, padding: '3px 10px', borderRadius: '100px', transition: 'all 0.15s' }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={lbl}>
                Additional Context <span style={{ color: C.border, fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea value={context} onChange={e => setContext(e.target.value)}
                placeholder={'e.g. "emphasize geometric intuition"\n"include connection to metric spaces"\n"focus on applications"'}
                style={{ ...field, minHeight: '88px', resize: 'vertical' }} disabled={isLoading} />
            </div>
          </div>

          <button type="submit" disabled={isLoading || !concept.trim()}
            style={{ width: '100%', background: isLoading ? C.surfaceLight : C.gold, border: 'none', color: isLoading ? C.muted : C.bg, cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '16px', fontFamily: FONT.sans, fontWeight: '600', padding: '15px', borderRadius: '8px', letterSpacing: '0.04em', transition: 'all 0.2s' }}>
            {isLoading ? (progress || 'Generating…') : 'Generate Lecture Deck →'}
          </button>
        </form>

        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            style={{ ...btn('ghost'), fontSize: '12px' }}
          >
            ↑ Import Deck JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>

        {error && (
          <div style={{ marginTop: '16px', background: C.red + '15', border: `1px solid ${C.red}50`, color: C.red, borderRadius: '8px', padding: '12px 16px', fontSize: '14px', fontFamily: FONT.sans, lineHeight: 1.5 }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <LibraryPanel onLoad={onLoad} />
      </div>
    </div>
  )
}
