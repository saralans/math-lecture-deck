import React, { useState, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { C, FONT, S, btn } from './styles.js'

// ─────────────────────────────────────────────────────────────
// LaTeX rendering
// ─────────────────────────────────────────────────────────────
function processLatex(text) {
  if (!text) return ''
  let result = String(text).replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { displayMode: true,  throwOnError: false, strict: false }) }
    catch { return `<span style="color:${C.red}">[math error]</span>` }
  })
  result = result.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false, strict: false }) }
    catch { return `<span style="color:${C.red}">[math error]</span>` }
  })
  return result
}

export function MathText({ text, style }) {
  const html = useMemo(() => processLatex(text), [text])
  return <span style={style} dangerouslySetInnerHTML={{ __html: html }} />
}

export function MathBlock({ text, style }) {
  const html = useMemo(() => processLatex(text), [text])
  return <div style={style} dangerouslySetInnerHTML={{ __html: html }} />
}

// ─────────────────────────────────────────────────────────────
// EditableField
// ─────────────────────────────────────────────────────────────
export function EditableField({ value, onChange, editMode, multiline, style }) {
  if (!editMode) {
    return multiline
      ? <MathBlock text={value} style={style} />
      : <MathText text={value} style={style} />
  }
  return (
    <div>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          minHeight: multiline ? '80px' : '40px',
          background: C.bg,
          border: `1px solid ${C.gold}60`,
          borderRadius: '4px',
          color: C.text,
          fontSize: '14px',
          fontFamily: FONT.serif,
          padding: '8px 10px',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ marginTop: '4px', padding: '4px 8px', background: C.surfaceLight, borderRadius: '4px' }}>
        <MathBlock text={value} style={{ fontSize: '12px', color: C.muted }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Slide type metadata
// ─────────────────────────────────────────────────────────────
export const TYPE_META = {
  title:          { label: 'Title',      color: C.gold },
  motivation:     { label: 'Motivation', color: C.defGreen },
  recall:         { label: 'Recall',     color: C.recallBlue },
  definition:     { label: 'Definition', color: C.defGreen },
  notation:       { label: 'Notation',   color: '#6890c0' },
  visual_example: { label: 'Visual',     color: '#9a9a50' },
  worked_example: { label: 'Example',    color: C.exOrange },
  theorem:        { label: 'Theorem',    color: C.thmPurple },
  exercise:       { label: 'Exercise',   color: C.exOrange },
  summary:        { label: 'Summary',    color: C.defGreen },
}

// ─────────────────────────────────────────────────────────────
// Slide components
// ─────────────────────────────────────────────────────────────

export function TitleSlide({ slide, editMode, onChange }) {
  return (
    <div style={{ ...S.container, justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '28px' }}>
      {(slide.subtitle || editMode) && (
        <div style={S.eyebrow}>
          {editMode
            ? <EditableField value={slide.subtitle} onChange={v => onChange('subtitle', v)} editMode={editMode} style={S.eyebrow} />
            : slide.subtitle}
        </div>
      )}
      <div style={{ maxWidth: '680px', width: '100%' }}>
        {editMode
          ? <EditableField value={slide.title} onChange={v => onChange('title', v)} editMode={editMode} style={{ fontSize: '56px', fontWeight: '400', color: C.text, lineHeight: 1.1 }} />
          : <h1 style={{ fontSize: '56px', fontWeight: '400', color: C.text, lineHeight: 1.1, letterSpacing: '-0.015em', fontFamily: FONT.serif, margin: 0 }}>{slide.title}</h1>
        }
      </div>
      <div style={{ width: '64px', height: '2px', background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`, borderRadius: '1px' }} />
      {(slide.overview || editMode) && (
        <div style={{ maxWidth: '580px', width: '100%' }}>
          <EditableField
            value={slide.overview}
            onChange={v => onChange('overview', v)}
            editMode={editMode}
            multiline
            style={{ ...S.body, maxWidth: '580px', color: C.muted, fontSize: '17px', lineHeight: 1.7 }}
          />
        </div>
      )}
      {!editMode && <div style={{ fontSize: '12px', color: C.border, fontFamily: FONT.sans }}>← → to navigate · Space to toggle script</div>}
    </div>
  )
}

export function MotivationSlide({ slide, editMode, onChange }) {
  return (
    <div style={S.container}>
      <div>
        <div style={S.eyebrow}>Motivation</div>
        <h2 style={S.heading}>
          {editMode
            ? <EditableField value={slide.heading || 'Why This Matters'} onChange={v => onChange('heading', v)} editMode={editMode} />
            : (slide.heading || 'Why This Matters')}
        </h2>
      </div>
      {(slide.central_question || editMode) && (
        <div style={{ ...S.accentBox(C.gold), fontStyle: 'italic', fontSize: '19px', color: C.text }}>
          <EditableField value={slide.central_question} onChange={v => onChange('central_question', v)} editMode={editMode} multiline style={{ fontStyle: 'italic', fontSize: '19px', color: C.text }} />
        </div>
      )}
      {(slide.analogy || editMode) && (
        <div>
          <div style={S.label}>Intuition</div>
          <div style={S.body}>
            <EditableField value={slide.analogy} onChange={v => onChange('analogy', v)} editMode={editMode} multiline style={S.body} />
          </div>
        </div>
      )}
      {(slide.key_insight || editMode) && (
        <div style={S.accentBox(C.defGreen)}>
          <div style={{ ...S.label, color: C.defGreen }}>Key Insight</div>
          <div style={{ ...S.body, fontSize: '17px' }}>
            <EditableField value={slide.key_insight} onChange={v => onChange('key_insight', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '17px' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function RecallSlide({ slide, editMode, onChange }) {
  return (
    <div style={S.container}>
      <div>
        <div style={S.eyebrow}>Prerequisites</div>
        <h2 style={S.heading}>{slide.heading || 'Recall'}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {(slide.items || []).map((item, i) => (
          <div key={i} style={S.bullet}>
            <span style={{ color: C.gold, fontSize: '22px', lineHeight: 1.55, flexShrink: 0 }}>·</span>
            <EditableField value={item} onChange={v => onChange('items', i, v)} editMode={editMode} style={S.bullet} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DefinitionSlide({ slide, editMode, onChange }) {
  return (
    <div style={S.container}>
      <div>
        {slide.section_ref && <div style={S.eyebrow}>Definition {slide.section_ref}</div>}
        <h2 style={S.heading}>
          {editMode
            ? <EditableField value={slide.term} onChange={v => onChange('term', v)} editMode={editMode} />
            : slide.term}
        </h2>
      </div>
      <div style={S.accentBox(C.defGreen)}>
        <div style={{ ...S.label, color: C.defGreen }}>Formal Definition</div>
        <EditableField value={slide.formal} onChange={v => onChange('formal', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '16.5px' }} />
      </div>
      {(slide.informal || editMode) && (
        <div>
          <div style={S.label}>In Plain Language</div>
          <div style={S.body}>
            <EditableField value={slide.informal} onChange={v => onChange('informal', v)} editMode={editMode} multiline style={S.body} />
          </div>
        </div>
      )}
      {slide.notes?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={S.label}>Notes</div>
          {slide.notes.map((note, i) => (
            <div key={i} style={{ ...S.bullet, fontSize: '15.5px', color: C.textDim }}>
              <span style={{ color: C.gold, flexShrink: 0 }}>→</span>
              <EditableField value={note} onChange={v => onChange('notes', i, v)} editMode={editMode} style={{ fontSize: '15.5px', color: C.textDim }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function NotationSlide({ slide, editMode, onChange }) {
  return (
    <div style={S.container}>
      <div>
        <div style={S.eyebrow}>Notation</div>
        <h2 style={S.heading}>{slide.heading || 'Common Representations'}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {(slide.representations || []).map((rep, i) => (
          <div key={i} style={{ ...S.box(), display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
            <div style={{ minWidth: '30px', height: '30px', background: C.gold, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontFamily: FONT.sans, color: C.bg, fontWeight: '700', flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              {rep.label && <div style={{ ...S.label, marginBottom: '4px' }}>{rep.label}</div>}
              <div style={{ fontSize: '19px', color: C.text }}>
                <EditableField value={rep.notation} onChange={v => onChange('representations', i, 'notation', v)} editMode={editMode} style={{ fontSize: '19px', color: C.text }} />
              </div>
              {(rep.description || editMode) && (
                <div style={{ ...S.body, fontSize: '15px', color: C.textDim, marginTop: '4px' }}>
                  <EditableField value={rep.description} onChange={v => onChange('representations', i, 'description', v)} editMode={editMode} style={{ ...S.body, fontSize: '15px', color: C.textDim }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function VisualExampleSlide({ slide, editMode, onChange }) {
  const steps = slide.steps || []
  const [revealed, setRevealed] = useState(0)

  return (
    <div style={S.container}>
      <div>
        <div style={S.eyebrow}>Visual Example</div>
        <h2 style={S.heading}>
          {editMode
            ? <EditableField value={slide.heading} onChange={v => onChange('heading', v)} editMode={editMode} />
            : slide.heading}
        </h2>
      </div>
      {(slide.setup || editMode) && (
        <div style={S.body}>
          <EditableField value={slide.setup} onChange={v => onChange('setup', v)} editMode={editMode} multiline style={S.body} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(editMode ? steps : steps.slice(0, revealed + 1)).map((step, i) => (
          <div key={i} style={{ ...S.box(), display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ minWidth: '26px', height: '26px', border: `2px solid ${C.gold}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontFamily: FONT.sans, color: C.gold, fontWeight: '700', flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...S.body, fontSize: '16px' }}>
                <EditableField value={step.description} onChange={v => onChange('steps', i, 'description', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '16px' }} />
              </div>
              {(step.math || editMode) && (
                <div style={{ marginTop: '8px' }}>
                  <EditableField value={step.math} onChange={v => onChange('steps', i, 'math', v)} editMode={editMode} multiline style={{ color: C.text }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!editMode && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {revealed < steps.length - 1 && (
            <button onClick={() => setRevealed(r => r + 1)} style={btn('outline')}>Next step →</button>
          )}
          {revealed > 0 && (
            <button onClick={() => setRevealed(0)} style={btn('ghost')}>Reset</button>
          )}
          {revealed === steps.length - 1 && steps.length > 1 && (
            <span style={{ fontSize: '13px', color: C.defGreen, fontFamily: FONT.sans }}>✓ All steps revealed</span>
          )}
        </div>
      )}

      {(editMode || revealed === steps.length - 1) && slide.insight && (
        <div style={S.accentBox(C.gold)}>
          <div style={{ ...S.label, color: C.goldLight }}>Insight</div>
          <div style={{ ...S.body, fontSize: '16px' }}>
            <EditableField value={slide.insight} onChange={v => onChange('insight', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '16px' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function WorkedExampleSlide({ slide, editMode, onChange }) {
  return (
    <div style={S.container}>
      <div>
        <div style={S.eyebrow}>Worked Example</div>
        <h2 style={S.heading}>
          {editMode
            ? <EditableField value={slide.heading} onChange={v => onChange('heading', v)} editMode={editMode} />
            : slide.heading}
        </h2>
      </div>
      <div style={S.accentBox(C.exOrange)}>
        <div style={{ ...S.label, color: '#d08868' }}>Problem</div>
        <div style={{ ...S.body, fontSize: '17px' }}>
          <EditableField value={slide.problem} onChange={v => onChange('problem', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '17px' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={S.label}>Solution</div>
        {(slide.steps || []).map((step, i) => (
          <div key={i} style={{ ...S.bullet, fontSize: '16px' }}>
            <span style={{ color: C.gold, flexShrink: 0 }}>→</span>
            <EditableField value={step} onChange={v => onChange('steps', i, v)} editMode={editMode} style={{ fontSize: '16px' }} />
          </div>
        ))}
      </div>
      {(slide.conclusion || editMode) && (
        <div style={S.accentBox(C.defGreen)}>
          <div style={{ ...S.label, color: C.defGreen }}>Conclusion</div>
          <EditableField value={slide.conclusion} onChange={v => onChange('conclusion', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '17px' }} />
        </div>
      )}
    </div>
  )
}

export function TheoremSlide({ slide, editMode, onChange }) {
  return (
    <div style={S.container}>
      <div>
        <div style={S.eyebrow}>{slide.section_ref ? `Theorem ${slide.section_ref}` : 'Theorem'}</div>
        <h2 style={S.heading}>
          {editMode
            ? <EditableField value={slide.name || 'Theorem'} onChange={v => onChange('name', v)} editMode={editMode} />
            : (slide.name || 'Theorem')}
        </h2>
      </div>
      <div style={S.accentBox(C.thmPurple)}>
        <div style={{ ...S.label, color: '#a080d0' }}>Statement</div>
        <EditableField value={slide.statement} onChange={v => onChange('statement', v)} editMode={editMode} multiline style={{ ...S.body, fontStyle: 'italic', fontSize: '17px' }} />
      </div>
      {(slide.proof_sketch || editMode) && (
        <div>
          <div style={S.label}>Proof Sketch</div>
          <div style={{ ...S.body, fontSize: '15.5px', color: C.textDim }}>
            <EditableField value={slide.proof_sketch} onChange={v => onChange('proof_sketch', v)} editMode={editMode} multiline style={{ fontSize: '15.5px', color: C.textDim }} />
          </div>
        </div>
      )}
      {(slide.significance || editMode) && (
        <div style={S.accentBox(C.defGreen)}>
          <div style={{ ...S.label, color: C.defGreen }}>Why It Matters</div>
          <div style={{ ...S.body, fontSize: '16px' }}>
            <EditableField value={slide.significance} onChange={v => onChange('significance', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '16px' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function ExerciseSlide({ slide, editMode, onChange }) {
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  return (
    <div style={S.container}>
      <div>
        <div style={S.eyebrow}>Exercise {slide.number || ''}</div>
        <h2 style={S.heading}>Practice Problem</h2>
      </div>
      <div style={S.accentBox(C.exOrange)}>
        <div style={{ ...S.label, color: '#d08868' }}>Problem</div>
        <div style={{ ...S.body, fontSize: '17px' }}>
          <EditableField value={slide.problem} onChange={v => onChange('problem', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '17px' }} />
        </div>
        {slide.parts?.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {slide.parts.map((part, i) => (
              <div key={i} style={{ ...S.bullet, fontSize: '16px' }}>
                <span style={{ color: C.gold, flexShrink: 0 }}>({String.fromCharCode(97 + i)})</span>
                <EditableField value={part} onChange={v => onChange('parts', i, v)} editMode={editMode} style={{ fontSize: '16px' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {editMode ? (
        <>
          {slide.hint && (
            <div>
              <div style={S.label}>Hint</div>
              <div style={{ ...S.body, fontSize: '15px', color: C.textDim }}>
                <EditableField value={slide.hint} onChange={v => onChange('hint', v)} editMode={editMode} multiline style={{ fontSize: '15px', color: C.textDim }} />
              </div>
            </div>
          )}
          {slide.solution && (
            <div style={S.accentBox(C.defGreen)}>
              <div style={{ ...S.label, color: C.defGreen }}>Solution</div>
              <EditableField value={slide.solution} onChange={v => onChange('solution', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '16px' }} />
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {slide.hint && (
              <button onClick={() => setShowHint(h => !h)} style={btn('ghost')}>
                {showHint ? 'Hide hint' : 'Hint'}
              </button>
            )}
            <button onClick={() => setShowSolution(s => !s)} style={btn(showSolution ? 'gold' : 'outline')}>
              {showSolution ? 'Hide solution' : 'Reveal solution'}
            </button>
          </div>
          {showHint && slide.hint && (
            <div style={{ ...S.body, fontSize: '15px', color: C.textDim }}>
              <strong style={{ color: C.gold, fontFamily: FONT.sans, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hint: </strong>
              <MathText text={slide.hint} />
            </div>
          )}
          {showSolution && (
            <div style={S.accentBox(C.defGreen)}>
              <div style={{ ...S.label, color: C.defGreen }}>Solution</div>
              <MathBlock text={slide.solution} style={{ ...S.body, fontSize: '16px' }} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function SummarySlide({ slide, editMode, onChange }) {
  return (
    <div style={S.container}>
      <div>
        <div style={S.eyebrow}>Wrap-Up</div>
        <h2 style={S.heading}>{slide.heading || 'Summary'}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={S.label}>Key Takeaways</div>
        {(slide.key_points || []).map((point, i) => (
          <div key={i} style={S.bullet}>
            <span style={{ color: C.gold, fontSize: '13px', fontFamily: FONT.sans, fontWeight: '700', flexShrink: 0, paddingTop: '3px', minWidth: '20px' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <EditableField value={point} onChange={v => onChange('key_points', i, v)} editMode={editMode} style={S.bullet} />
          </div>
        ))}
      </div>
      {(slide.connections || editMode) && (
        <div style={S.box()}>
          <div style={S.label}>Connections to Other Topics</div>
          <div style={{ ...S.body, fontSize: '16px' }}>
            <EditableField value={slide.connections} onChange={v => onChange('connections', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '16px' }} />
          </div>
        </div>
      )}
      {(slide.next_steps || editMode) && (
        <div style={S.accentBox(C.gold)}>
          <div style={{ ...S.label, color: C.goldLight }}>What's Next</div>
          <div style={{ ...S.body, fontSize: '16px' }}>
            <EditableField value={slide.next_steps} onChange={v => onChange('next_steps', v)} editMode={editMode} multiline style={{ ...S.body, fontSize: '16px' }} />
          </div>
        </div>
      )}
    </div>
  )
}

function UnknownSlide({ slide }) {
  return (
    <div style={S.container}>
      <pre style={{ ...S.body, fontSize: '13px', color: C.muted, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(slide, null, 2)}
      </pre>
    </div>
  )
}

export const RENDERERS = {
  title:          TitleSlide,
  motivation:     MotivationSlide,
  recall:         RecallSlide,
  definition:     DefinitionSlide,
  notation:       NotationSlide,
  visual_example: VisualExampleSlide,
  worked_example: WorkedExampleSlide,
  theorem:        TheoremSlide,
  exercise:       ExerciseSlide,
  summary:        SummarySlide,
  _unknown:       UnknownSlide,
}
