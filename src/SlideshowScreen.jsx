import React, { useState, useCallback, useEffect } from 'react'
import JSZip from 'jszip'
import { C, FONT, S, btn } from './styles.js'
import { TYPE_META, RENDERERS, MathText } from './slideRenderers.jsx'
import { saveToLibrary } from './library.js'
import { encodeDeckToHash } from './share.js'

// ─────────────────────────────────────────────────────────────
// Pure content builders — used by individual downloads + zip
// ─────────────────────────────────────────────────────────────
function buildScriptText(deck, slides) {
  const lines = [
    'LECTURE SCRIPT',
    `Concept: ${deck.concept}`,
    deck.textbook_ref ? `Reference: ${deck.textbook_ref}` : '',
    `Generated: ${new Date().toLocaleDateString()}`,
    '═'.repeat(60), '',
  ]
  slides.forEach((s, i) => {
    const m = TYPE_META[s.type] || { label: s.type }
    const title = s.title || s.heading || s.term || s.name || ''
    lines.push(`SLIDE ${i + 1}  [${m.label.toUpperCase()}]  ${title}`)
    lines.push('─'.repeat(50))
    lines.push(s.speaker_script || '(no script)')
    lines.push('')
  })
  return lines.join('\n')
}

function buildMarkdown(deck, slides) {
  const lines = [
    `# ${deck.concept}`,
    deck.textbook_ref ? `*${deck.textbook_ref}*` : '',
    '', '---', '',
  ]
  slides.forEach((s, i) => {
    const title = s.title || s.heading || s.term || s.name || ''
    const m = TYPE_META[s.type] || { label: s.type }
    lines.push(`## Slide ${i + 1} · ${m.label}${title ? ': ' + title : ''}`, '')
    switch (s.type) {
      case 'title':
        if (s.overview) lines.push(s.overview, '')
        break
      case 'motivation':
        if (s.central_question) lines.push(`> ${s.central_question}`, '')
        if (s.analogy)          lines.push(`**Intuition:** ${s.analogy}`, '')
        if (s.key_insight)      lines.push(`**Key Insight:** ${s.key_insight}`, '')
        break
      case 'recall':
        ;(s.items || []).forEach(it => lines.push(`- ${it}`))
        lines.push('')
        break
      case 'definition':
        lines.push(`**Formal:**`, '', s.formal, '')
        if (s.informal) lines.push(`**Plain language:** ${s.informal}`, '')
        ;(s.notes || []).forEach(n => lines.push(`- ${n}`))
        if (s.notes?.length) lines.push('')
        break
      case 'notation':
        ;(s.representations || []).forEach((r, j) => {
          lines.push(`**${j + 1}. ${r.label || ''}** — ${r.notation}`)
          if (r.description) lines.push(`   ${r.description}`)
        })
        lines.push('')
        break
      case 'visual_example':
        if (s.setup) lines.push(s.setup, '')
        ;(s.steps || []).forEach((st, j) => {
          lines.push(`**Step ${j + 1}:** ${st.description}`)
          if (st.math) lines.push('', st.math)
          lines.push('')
        })
        if (s.insight) lines.push(`**Insight:** ${s.insight}`, '')
        break
      case 'worked_example':
        lines.push(`**Problem:** ${s.problem}`, '')
        ;(s.steps || []).forEach(st => lines.push(`- ${st}`))
        lines.push('')
        if (s.conclusion) lines.push(`**Conclusion:** ${s.conclusion}`, '')
        break
      case 'theorem':
        lines.push(`> *${s.statement}*`, '')
        if (s.proof_sketch) lines.push(`**Proof sketch:** ${s.proof_sketch}`, '')
        if (s.significance)  lines.push(`**Significance:** ${s.significance}`, '')
        break
      case 'exercise':
        lines.push(`**Problem:** ${s.problem}`, '')
        ;(s.parts || []).forEach((p, j) => lines.push(`(${String.fromCharCode(97+j)}) ${p}`))
        if (s.parts?.length) lines.push('')
        if (s.hint)     lines.push(`**Hint:** ${s.hint}`, '')
        if (s.solution) lines.push(`**Solution:**`, '', s.solution, '')
        break
      case 'summary':
        ;(s.key_points || []).forEach((p, j) => lines.push(`${j+1}. ${p}`))
        lines.push('')
        if (s.connections) lines.push(`**Connections:** ${s.connections}`, '')
        if (s.next_steps)  lines.push(`**Next:** ${s.next_steps}`, '')
        break
    }
    if (s.speaker_script) lines.push(`*Speaker script: ${s.speaker_script}*`, '')
    lines.push('---', '')
  })
  return lines.join('\n')
}

function buildLatex(deck, slides) {
  const esc = t => (t || '').replace(/([&%#_{}~^\\])/g, (m, c) => {
    if (c === '\\') return '\\textbackslash{}'
    return '\\' + c
  })
  const safeTex = t => {
    if (!t) return ''
    return t.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/).map((seg, i) =>
      i % 2 === 0 ? esc(seg) : seg
    ).join('')
  }
  const lines = [
    '\\documentclass{beamer}',
    '\\usepackage{amsmath,amssymb,mathtools}',
    '\\usepackage[utf8]{inputenc}',
    '\\usetheme{Madrid}',
    '\\usecolortheme{crane}',
    `\\title{${safeTex(deck.concept)}}`,
    deck.textbook_ref ? `\\subtitle{${safeTex(deck.textbook_ref)}}` : '',
    '\\date{}',
    '',
    '\\begin{document}',
    '\\begin{frame}\\titlepage\\end{frame}',
    '',
  ]
  slides.forEach(s => {
    if (s.type === 'title') return
    const frameTitle = safeTex(s.heading || s.term || s.name || TYPE_META[s.type]?.label || s.type)
    lines.push(`\\begin{frame}{${frameTitle}}`)
    switch (s.type) {
      case 'motivation':
        if (s.central_question) lines.push(`\\begin{alertblock}{Question}\n${safeTex(s.central_question)}\n\\end{alertblock}`)
        if (s.key_insight)      lines.push(`\\begin{block}{Key Insight}\n${safeTex(s.key_insight)}\n\\end{block}`)
        break
      case 'recall':
        lines.push('\\begin{itemize}')
        ;(s.items || []).forEach(it => lines.push(`  \\item ${safeTex(it)}`))
        lines.push('\\end{itemize}')
        break
      case 'definition':
        lines.push(`\\begin{definition}[${safeTex(s.term)}]\n${safeTex(s.formal)}\n\\end{definition}`)
        if (s.informal) lines.push(`\\textit{${safeTex(s.informal)}}`)
        if (s.notes?.length) {
          lines.push('\\begin{itemize}')
          s.notes.forEach(n => lines.push(`  \\item ${safeTex(n)}`))
          lines.push('\\end{itemize}')
        }
        break
      case 'notation':
        lines.push('\\begin{enumerate}')
        ;(s.representations || []).forEach(r => lines.push(`  \\item \\textbf{${safeTex(r.label)}:} ${safeTex(r.notation)}`))
        lines.push('\\end{enumerate}')
        break
      case 'worked_example':
        lines.push(`\\begin{alertblock}{Problem}\n${safeTex(s.problem)}\n\\end{alertblock}`)
        if (s.steps?.length) {
          lines.push('\\begin{itemize}')
          s.steps.forEach(st => lines.push(`  \\item ${safeTex(st)}`))
          lines.push('\\end{itemize}')
        }
        if (s.conclusion) lines.push(`\\begin{block}{Conclusion}\n${safeTex(s.conclusion)}\n\\end{block}`)
        break
      case 'visual_example':
        if (s.setup) lines.push(safeTex(s.setup))
        if (s.steps?.length) {
          lines.push('\\begin{enumerate}')
          s.steps.forEach(st => lines.push(`  \\item ${safeTex(st.description)}`))
          lines.push('\\end{enumerate}')
        }
        if (s.insight) lines.push(`\\begin{block}{Insight}\n${safeTex(s.insight)}\n\\end{block}`)
        break
      case 'theorem':
        lines.push(`\\begin{theorem}[${safeTex(s.name || '')}]\n${safeTex(s.statement)}\n\\end{theorem}`)
        if (s.proof_sketch) lines.push(`\\begin{proof}[Proof Sketch]\n${safeTex(s.proof_sketch)}\n\\end{proof}`)
        if (s.significance)  lines.push(`\\begin{block}{Significance}\n${safeTex(s.significance)}\n\\end{block}`)
        break
      case 'exercise':
        lines.push(`\\begin{alertblock}{Problem ${safeTex(s.number || '')}}\n${safeTex(s.problem)}`)
        if (s.parts?.length) {
          lines.push('\\begin{enumerate}[(a)]')
          s.parts.forEach(p => lines.push(`  \\item ${safeTex(p)}`))
          lines.push('\\end{enumerate}')
        }
        lines.push('\\end{alertblock}')
        if (s.solution) lines.push(`\\begin{exampleblock}{Solution}\n${safeTex(s.solution)}\n\\end{exampleblock}`)
        break
      case 'summary':
        lines.push('\\begin{enumerate}')
        ;(s.key_points || []).forEach(p => lines.push(`  \\item ${safeTex(p)}`))
        lines.push('\\end{enumerate}')
        if (s.connections) lines.push(`\\begin{block}{Connections}\n${safeTex(s.connections)}\n\\end{block}`)
        break
    }
    lines.push('\\end{frame}', '')
  })
  lines.push('\\end{document}')
  return lines.join('\n')
}

function buildDeckJson(deck) {
  return JSON.stringify(deck, null, 2)
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function SlideshowScreen({ deck, onReset, onDeckChange }) {
  const [current,     setCurrent]     = useState(0)
  const [showScript,  setShowScript]  = useState(true)
  const [editMode,    setEditMode]    = useState(false)
  const [showExport,  setShowExport]  = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [saveConfirm, setSaveConfirm] = useState(false)
  const [zipping,     setZipping]     = useState(false)

  const slides = deck.slides || []
  const slide  = slides[current]
  const total  = slides.length

  const go = useCallback((dir) => {
    setCurrent(c => Math.max(0, Math.min(total - 1, c + dir)))
  }, [total])

  useEffect(() => {
    const handler = (e) => {
      if (editMode) return
      if (e.key === 'ArrowLeft')  go(-1)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === ' ') { e.preventDefault(); setShowScript(s => !s) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go, editMode])

  // ── Edit updaters ──
  const handleFieldChange = useCallback((slideIdx, field, value) => {
    onDeckChange(prev => {
      const slides = prev.slides.map((s, i) =>
        i === slideIdx ? { ...s, [field]: value } : s
      )
      return { ...prev, slides }
    })
  }, [onDeckChange])

  const handleArrayItemChange = useCallback((slideIdx, arr, itemIdx, value) => {
    onDeckChange(prev => {
      const slides = prev.slides.map((s, i) => {
        if (i !== slideIdx) return s
        const newArr = [...(s[arr] || [])]
        newArr[itemIdx] = value
        return { ...s, [arr]: newArr }
      })
      return { ...prev, slides }
    })
  }, [onDeckChange])

  const handleNestedArrayItemChange = useCallback((slideIdx, arr, itemIdx, subField, value) => {
    onDeckChange(prev => {
      const slides = prev.slides.map((s, i) => {
        if (i !== slideIdx) return s
        const newArr = (s[arr] || []).map((item, j) =>
          j === itemIdx ? { ...item, [subField]: value } : item
        )
        return { ...s, [arr]: newArr }
      })
      return { ...prev, slides }
    })
  }, [onDeckChange])

  const makeOnChange = (slideIdx) => (...args) => {
    if (args.length === 2)      handleFieldChange(slideIdx, args[0], args[1])
    else if (args.length === 3) handleArrayItemChange(slideIdx, args[0], args[1], args[2])
    else if (args.length === 4) handleNestedArrayItemChange(slideIdx, args[0], args[1], args[2], args[3])
  }

  const meta      = TYPE_META[slide?.type] || { label: slide?.type, color: C.muted }
  const SlideComp = RENDERERS[slide?.type] || RENDERERS._unknown
  const slug      = (deck.concept || 'deck').replace(/\s+/g, '-').toLowerCase()

  // ── Share ──
  const handleShare = useCallback(() => {
    const hash = encodeDeckToHash(deck)
    const url = `${location.origin}${location.pathname}#deck=${hash}`
    if (url.length > 50000) {
      alert('Deck too large for URL sharing. Use Export → Deck JSON instead.')
      return
    }
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
    })
  }, [deck])

  // ── Save ──
  const handleSave = useCallback(() => {
    saveToLibrary(deck, deck.subject)
    setSaveConfirm(true)
    setTimeout(() => setSaveConfirm(false), 2000)
  }, [deck])

  // ── Individual downloads ──
  const triggerDownload = (content, filename, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }))
    Object.assign(document.createElement('a'), { href: url, download: filename }).click()
    URL.revokeObjectURL(url)
  }

  const downloadScript   = useCallback(() => triggerDownload(buildScriptText(deck, slides), `${slug}-script.txt`, 'text/plain'), [deck, slides, slug])
  const downloadMarkdown = useCallback(() => triggerDownload(buildMarkdown(deck, slides),    `${slug}.md`,          'text/markdown'), [deck, slides, slug])
  const downloadLatex    = useCallback(() => triggerDownload(buildLatex(deck, slides),       `${slug}.tex`,         'text/plain'), [deck, slides, slug])
  const downloadDeckJson = useCallback(() => triggerDownload(buildDeckJson(deck),            `${slug}.json`,        'application/json'), [deck, slug])

  // ── ZIP all ──
  const downloadAllZip = useCallback(async () => {
    setZipping(true)
    setShowExport(false)
    try {
      const zip = new JSZip()
      const folder = zip.folder(slug)
      folder.file(`${slug}-script.txt`, buildScriptText(deck, slides))
      folder.file(`${slug}.md`,         buildMarkdown(deck, slides))
      folder.file(`${slug}.tex`,        buildLatex(deck, slides))
      folder.file(`${slug}.json`,       buildDeckJson(deck))
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      triggerDownload(blob, `${slug}.zip`, 'application/zip')
    } finally {
      setZipping(false)
    }
  }, [deck, slides, slug])

  // ── Print view ──
  const openPrintView = useCallback(() => {
    const win = window.open('', '_blank')
    const katexCss = 'https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css'
    const katexJs  = 'https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.js'
    const renderMathInElement = 'https://cdn.jsdelivr.net/npm/katex@0.16/dist/contrib/auto-render.min.js'

    const slideHtml = slides.map((s, i) => {
      const m = TYPE_META[s.type] || { label: s.type }
      const title = s.title || s.heading || s.term || s.name || ''
      const rows = []
      switch (s.type) {
        case 'title':
          rows.push(`<h1 class="slide-title">${s.title}</h1>`)
          if (s.subtitle) rows.push(`<p class="subtitle">${s.subtitle}</p>`)
          if (s.overview) rows.push(`<p class="overview">${s.overview}</p>`)
          break
        case 'recall':
          rows.push(`<ul>${(s.items||[]).map(it=>`<li>${it}</li>`).join('')}</ul>`)
          break
        case 'definition':
          rows.push(`<div class="box defbox"><div class="box-label">Formal Definition</div><p>${s.formal}</p></div>`)
          if (s.informal) rows.push(`<p><em>${s.informal}</em></p>`)
          if (s.notes?.length) rows.push(`<ul>${s.notes.map(n=>`<li>${n}</li>`).join('')}</ul>`)
          break
        case 'motivation':
          if (s.central_question) rows.push(`<blockquote>${s.central_question}</blockquote>`)
          if (s.analogy)    rows.push(`<p><strong>Intuition:</strong> ${s.analogy}</p>`)
          if (s.key_insight) rows.push(`<div class="box insightbox"><strong>Key Insight:</strong> ${s.key_insight}</div>`)
          break
        case 'notation':
          rows.push(`<ol>${(s.representations||[]).map(r=>`<li><strong>${r.label||''}:</strong> ${r.notation}${r.description?'<br><em>'+r.description+'</em>':''}</li>`).join('')}</ol>`)
          break
        case 'visual_example':
          if (s.setup) rows.push(`<p>${s.setup}</p>`)
          rows.push(`<ol>${(s.steps||[]).map(st=>`<li>${st.description}${st.math?'<div class="math">'+st.math+'</div>':''}</li>`).join('')}</ol>`)
          if (s.insight) rows.push(`<div class="box insightbox"><strong>Insight:</strong> ${s.insight}</div>`)
          break
        case 'worked_example':
          rows.push(`<div class="box probbox"><strong>Problem:</strong> ${s.problem}</div>`)
          rows.push(`<ul>${(s.steps||[]).map(st=>`<li>${st}</li>`).join('')}</ul>`)
          if (s.conclusion) rows.push(`<div class="box defbox"><strong>Conclusion:</strong> ${s.conclusion}</div>`)
          break
        case 'theorem':
          rows.push(`<div class="box thmbox"><em>${s.statement}</em></div>`)
          if (s.proof_sketch) rows.push(`<p><strong>Proof sketch:</strong> ${s.proof_sketch}</p>`)
          if (s.significance)  rows.push(`<div class="box insightbox"><strong>Significance:</strong> ${s.significance}</div>`)
          break
        case 'exercise':
          rows.push(`<div class="box probbox"><strong>Problem ${s.number||''}:</strong> ${s.problem}</div>`)
          if (s.parts?.length) rows.push(`<ol type="a">${s.parts.map(p=>`<li>${p}</li>`).join('')}</ol>`)
          if (s.hint)     rows.push(`<p><strong>Hint:</strong> ${s.hint}</p>`)
          if (s.solution) rows.push(`<div class="box defbox"><strong>Solution:</strong> ${s.solution}</div>`)
          break
        case 'summary':
          rows.push(`<ol>${(s.key_points||[]).map(p=>`<li>${p}</li>`).join('')}</ol>`)
          if (s.connections) rows.push(`<p><strong>Connections:</strong> ${s.connections}</p>`)
          if (s.next_steps)  rows.push(`<p><strong>Next:</strong> ${s.next_steps}</p>`)
          break
      }
      if (s.speaker_script) rows.push(`<div class="script"><strong>Script:</strong> ${s.speaker_script}</div>`)
      return `<div class="slide">
        <div class="slide-header"><span class="type-badge">${m.label}</span><span class="slide-num">${i+1} / ${slides.length}</span></div>
        ${title && s.type !== 'title' ? `<h2>${title}</h2>` : ''}
        ${rows.join('\n')}
      </div>`
    }).join('\n')

    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>${deck.concept} — Lecture Deck</title>
      <link rel="stylesheet" href="${katexCss}">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Georgia, serif; background: #fff; color: #111; font-size: 13pt; }
        .slide { page-break-after: always; padding: 48px 56px; min-height: 100vh; display: flex; flex-direction: column; gap: 16px; border-bottom: 2px solid #ddd; }
        .slide:last-child { border-bottom: none; }
        .slide-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .type-badge { font-family: system-ui; font-size: 9pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #7a6030; border: 1px solid #c9973a; border-radius: 100px; padding: 2px 10px; }
        .slide-num { font-family: system-ui; font-size: 9pt; color: #aaa; }
        h1.slide-title { font-size: 36pt; font-weight: 400; line-height: 1.1; margin: 40px 0 12px; text-align: center; }
        .subtitle { text-align: center; font-size: 12pt; color: #888; font-family: system-ui; letter-spacing: 0.15em; text-transform: uppercase; }
        .overview { text-align: center; color: #555; font-size: 12pt; margin-top: 16px; max-width: 560px; margin-left: auto; margin-right: auto; line-height: 1.7; }
        h2 { font-size: 20pt; font-weight: 500; color: #3a2a10; margin-bottom: 4px; }
        p { font-size: 12pt; line-height: 1.7; }
        ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
        li { font-size: 11.5pt; line-height: 1.65; }
        blockquote { border-left: 4px solid #c9973a; padding: 12px 18px; background: #fdf8f0; font-style: italic; font-size: 13pt; }
        .box { border-radius: 6px; padding: 14px 18px; font-size: 11.5pt; line-height: 1.65; }
        .defbox  { background: #f0f8f2; border-left: 4px solid #3a7a58; }
        .thmbox  { background: #f5f0fc; border-left: 4px solid #7a60b0; font-style: italic; }
        .probbox { background: #fdf4f0; border-left: 4px solid #b06848; }
        .insightbox { background: #fdf8f0; border-left: 4px solid #c9973a; }
        .script { margin-top: auto; padding-top: 16px; border-top: 1px solid #eee; font-size: 10pt; color: #888; font-style: italic; line-height: 1.6; }
        .math { margin: 8px 0; }
        @media print { .slide { border-bottom: none; } }
      </style>
    </head><body>
      ${slideHtml}
      <script src="${katexJs}"></script>
      <script src="${renderMathInElement}"></script>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          renderMathInElement(document.body, {
            delimiters: [
              {left: '$$', right: '$$', display: true},
              {left: '$', right: '$', display: false}
            ],
            throwOnError: false
          })
        })
        setTimeout(() => window.print(), 800)
      </script>
    </body></html>`)
    win.document.close()
  }, [deck, slides])

  return (
    <div style={{ height: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={onReset} style={{ ...btn('ghost'), padding: '5px 10px', fontSize: '12px' }}>← New</button>
        <div style={{ width: '1px', height: '20px', background: C.border }} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <span style={{ fontSize: '15px', color: C.text, fontWeight: '500', fontFamily: FONT.serif }}>{deck.concept}</span>
          {deck.textbook_ref && <span style={{ fontSize: '13px', color: C.muted, marginLeft: '10px', fontFamily: FONT.sans }}>{deck.textbook_ref}</span>}
        </div>
        <div style={{ background: meta.color + '18', color: meta.color, fontSize: '11px', fontFamily: FONT.sans, fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '100px', border: `1px solid ${meta.color}40`, flexShrink: 0 }}>
          {meta.label}
        </div>
        <div style={{ fontSize: '13px', color: C.muted, fontFamily: FONT.sans, flexShrink: 0 }}>{current + 1} / {total}</div>

        <button onClick={() => setEditMode(e => !e)} style={{ ...btn(editMode ? 'gold' : 'ghost'), fontSize: '12px', padding: '5px 12px' }}>
          {editMode ? 'Done editing' : 'Edit'}
        </button>
        <button onClick={() => setShowScript(s => !s)} title="Toggle speaker script (Space)" style={{ ...btn(showScript ? 'outline' : 'ghost'), fontSize: '12px', padding: '5px 12px' }}>
          Script
        </button>
        <button onClick={handleShare} style={{ ...btn(shareCopied ? 'gold' : 'ghost'), fontSize: '12px', padding: '5px 12px' }}>
          {shareCopied ? '✓ Copied!' : 'Share'}
        </button>
        <button onClick={handleSave} style={{ ...btn(saveConfirm ? 'gold' : 'ghost'), fontSize: '12px', padding: '5px 12px' }}>
          {saveConfirm ? '✓ Saved' : 'Save'}
        </button>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowExport(e => !e)} style={{ ...btn(showExport ? 'outline' : 'ghost'), fontSize: '12px', padding: '5px 12px' }}>
            {zipping ? '⏳ Zipping…' : '↓ Export'}
          </button>
          {showExport && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 100, minWidth: '200px' }}>
              <div style={{ fontSize: '10px', color: C.muted, fontFamily: FONT.sans, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px 6px' }}>
                Individual files
              </div>
              {[
                { label: '↓ Speaker Script (.txt)', action: downloadScript },
                { label: '↓ Markdown (.md)',        action: downloadMarkdown },
                { label: '↓ LaTeX Beamer (.tex)',   action: downloadLatex },
                { label: '↓ Deck JSON (.json)',     action: downloadDeckJson },
                { label: '⎙  Print / Save as PDF',  action: openPrintView },
              ].map(({ label, action }) => (
                <button key={label} onClick={() => { action(); setShowExport(false) }}
                  style={{ ...btn('ghost'), textAlign: 'left', padding: '7px 12px', fontSize: '12px', borderRadius: '5px', border: 'none' }}>
                  {label}
                </button>
              ))}
              <div style={{ height: '1px', background: C.border, margin: '4px 0' }} />
              <button
                onClick={downloadAllZip}
                style={{ ...btn('outline'), textAlign: 'left', padding: '8px 12px', fontSize: '12px', borderRadius: '5px', fontWeight: '600' }}
              >
                ↓ All Files (.zip)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: C.surfaceLight, flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${((current + 1) / total) * 100}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`, transition: 'width 0.35s ease' }} />
      </div>

      {/* Content row */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', outline: editMode ? `2px solid ${C.gold}40` : 'none', outlineOffset: '-2px' }}>
          <SlideComp slide={slide} editMode={editMode} onChange={makeOnChange(current)} />
        </div>

        {showScript && (
          <div style={{ width: '300px', flexShrink: 0, background: C.surface, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${C.border}`, fontSize: '10px', color: C.muted, fontFamily: FONT.sans, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Speaker Script
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '18px' }}>
              {editMode ? (
                <textarea
                  value={slide?.speaker_script || ''}
                  onChange={e => handleFieldChange(current, 'speaker_script', e.target.value)}
                  style={{ width: '100%', height: '100%', background: C.bg, border: `1px solid ${C.gold}40`, borderRadius: '4px', color: C.textDim, fontSize: '14px', fontFamily: FONT.serif, padding: '8px', resize: 'none', boxSizing: 'border-box', lineHeight: 1.78 }}
                />
              ) : (
                slide?.speaker_script
                  ? <p style={{ fontSize: '14.5px', color: C.textDim, lineHeight: 1.78, margin: 0, fontFamily: FONT.serif }}><MathText text={slide.speaker_script} /></p>
                  : <p style={{ fontSize: '13px', color: C.border, fontStyle: 'italic', margin: 0 }}>No script for this slide.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', background: C.surface, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => go(-1)} disabled={current === 0} style={{ ...btn('ghost'), opacity: current === 0 ? 0.3 : 1, cursor: current === 0 ? 'not-allowed' : 'pointer' }}>← Prev</button>

        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '380px' }}>
          {slides.map((s, i) => {
            const m = TYPE_META[s.type]
            const active = i === current
            return (
              <button key={i} onClick={() => setCurrent(i)} title={`${i + 1}: ${m?.label || s.type}`}
                style={{ width: active ? '24px' : '8px', height: '8px', borderRadius: '4px', background: active ? C.gold : (m?.color + '50' || C.border), border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.25s ease' }} />
            )
          })}
        </div>

        <button onClick={() => go(1)} disabled={current === total - 1} style={{ ...btn(current === total - 1 ? 'ghost' : 'gold'), opacity: current === total - 1 ? 0.3 : 1, cursor: current === total - 1 ? 'not-allowed' : 'pointer' }}>Next →</button>
      </div>
    </div>
  )
}
