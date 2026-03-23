import { SUBJECTS } from './data.js'

const SLIDE_SCHEMA = `JSON SCHEMA — return ONLY valid JSON, no markdown, no code fences:
{
  "concept": "string",
  "textbook_ref": "string",
  "slides": [
    { "type": "title",          "title": "string", "subtitle": "string", "overview": "string", "speaker_script": "string" },
    { "type": "motivation",     "heading": "string", "central_question": "string", "analogy": "string", "key_insight": "string", "speaker_script": "string" },
    { "type": "recall",         "heading": "Recall", "items": ["string with LaTeX"], "speaker_script": "string" },
    { "type": "definition",     "section_ref": "string", "term": "string", "formal": "string (LaTeX)", "informal": "string", "notes": ["string"], "speaker_script": "string" },
    { "type": "notation",       "heading": "string", "representations": [{ "label": "string", "notation": "string", "description": "string" }], "speaker_script": "string" },
    { "type": "visual_example", "heading": "string", "setup": "string", "steps": [{ "description": "string", "math": "string" }], "insight": "string", "speaker_script": "string" },
    { "type": "worked_example", "heading": "string", "problem": "string", "steps": ["string"], "conclusion": "string", "speaker_script": "string" },
    { "type": "theorem",        "section_ref": "string", "name": "string", "statement": "string (LaTeX)", "proof_sketch": "string", "significance": "string", "speaker_script": "string" },
    { "type": "exercise",       "number": "string", "problem": "string", "parts": ["string"], "hint": "string", "solution": "string", "speaker_script": "string" },
    { "type": "summary",        "heading": "Summary", "key_points": ["string (LaTeX)"], "connections": "string", "next_steps": "string", "speaker_script": "string" }
  ]
}

Aim for 8-10 slides total. Keep each speaker_script to 2-3 sentences — concise but informative.`

const QUALITY_STANDARD = `QUALITY STANDARD — mirror the pedagogical style of these exemplary elements:
• Opens with an intuitive everyday analogy before formal definitions
• Gives the formal definition in full LaTeX, then restates it in plain English
• Shows multiple notations/representations for each concept, labeled clearly
• Walks through examples step-by-step, building intuition incrementally
• States theorems precisely in LaTeX, adds a proof sketch and significance
• Includes 2-3 exercises with complete solutions
• Speaker scripts are conversational but mathematically precise — written as if addressing live undergraduates`

const LATEX_CONVENTIONS = `LaTeX usage:
• Inline math: $...$ (single dollar signs)
• Display/block math: $$...$$ (double dollar signs)
• Use standard notation: \\mathbb{R}, \\mathbb{N}, \\epsilon, \\delta, \\lim_{n \\to \\infty}, \\sup, \\inf, \\forall, \\exists, |x_n - L| < \\epsilon, \\{s_n\\}, (s_n) etc.`

const SLIDE_TYPES = `SLIDE TYPES (use exactly these type strings, in this order):
1. title
2. motivation
3. recall
4. definition (repeat for each key definition)
5. notation
6. visual_example
7. worked_example (1-2 slides)
8. theorem (2-5 slides for the main results)
9. exercise (2-3 slides with full solutions)
10. summary`

export function buildSystemPrompt(subject) {
  const s = SUBJECTS[subject] || SUBJECTS['real_analysis']
  return `You are an expert ${s.label} lecturer producing a structured lecture deck JSON.

SUBJECT CONTEXT: ${s.systemPromptHint}

${QUALITY_STANDARD}

${LATEX_CONVENTIONS}

${SLIDE_TYPES}

${SLIDE_SCHEMA}`
}

export function buildPrompt(concept, context, subject) {
  const s = SUBJECTS[subject] || SUBJECTS['real_analysis']
  let p = `Generate a complete lecture deck for the ${s.label} concept: **${concept}**`
  if (context?.trim()) p += `\n\nAdditional context / constraints:\n${context.trim()}`
  p += '\n\nReturn ONLY valid JSON. No markdown. No code fences.'
  return p
}

export async function getQuota(token) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch('/api/usage', { headers })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function callAPI(concept, context, subject, onStatus, token) {
  onStatus('Generating lecture deck...')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ concept, context, subject }),
  })

  if (res.status === 429) {
    throw new Error('Daily generation limit reached. Please try again tomorrow.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  onStatus('Parsing lecture deck...')
  return res.json()
}
