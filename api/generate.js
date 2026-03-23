const LIMITS = { free: 10, basic: 50, pro: Infinity }

async function getSubscriptionTier(userId, authHeader, supabaseUrl, supabaseAnonKey) {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&select=tier,status,current_period_end`,
      { headers: { Authorization: authHeader, apikey: supabaseAnonKey } }
    )
    if (!res.ok) return 'free'
    const data = await res.json()
    const sub = data[0]
    if (!sub || sub.status !== 'active') return 'free'
    if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return 'free'
    return sub.tier || 'free'
  } catch { return 'free' }
}

// Inline subject data (can't import from src/ in serverless functions)
const SUBJECTS = {
  real_analysis:          { label: 'Real Analysis',            systemPromptHint: 'Emphasize epsilon-delta rigor. Use Ross-style notation. Ground every definition in concrete sequence or metric space examples before abstraction. Cite section references like §10.8.' },
  calculus:               { label: 'Calculus',                 systemPromptHint: 'Start with geometric intuition (slopes, areas, rates). Use visual descriptions of curves and tangent lines. Connect derivatives and integrals to real-world rates of change. Limit formalism to where it truly helps.' },
  linear_algebra:         { label: 'Linear Algebra',           systemPromptHint: 'Emphasize geometric meaning of transformations — what do matrices *do* to vectors? Use concrete 2D and 3D examples before generalizing. Connect algebra to geometry constantly.' },
  topology:               { label: 'Topology',                 systemPromptHint: 'Build intuition with concrete metric spaces and subsets of ℝⁿ before abstracting. Use rubber-sheet geometry analogies. Emphasize which properties are topological invariants and why that matters.' },
  abstract_algebra:       { label: 'Abstract Algebra',         systemPromptHint: 'Start each concept with a concrete example (integers, symmetric groups, polynomials) before the abstract definition. Use tables and diagrams for small groups. Emphasize the "why" behind each structural constraint.' },
  optimization:           { label: 'Optimization',             systemPromptHint: 'Motivate each method with a concrete optimization problem. Visualize loss landscapes. Connect first-order and second-order conditions geometrically. Emphasize practical convergence rates and when each method applies.' },
  probability:            { label: 'Probability Theory',       systemPromptHint: 'Always ground probability in a concrete sample space first. Use simulation intuition — "if you ran this experiment a million times…". Distinguish between almost-sure, in-probability, and in-distribution convergence clearly.' },
  differential_equations: { label: 'Differential Equations',   systemPromptHint: 'Start with a physical or biological model (population, heat, oscillation) that motivates the equation. Draw direction fields and phase portraits. Emphasize qualitative behavior alongside algebraic solution methods.' },
  complex_analysis:       { label: 'Complex Analysis',         systemPromptHint: 'Visualize everything in the complex plane. Use geometric interpretations of analytic functions as angle-preserving maps. Connect real and imaginary parts via harmonicity. Show how contour integration unlocks otherwise-intractable real integrals.' },
  numerical_analysis:     { label: 'Numerical Analysis',       systemPromptHint: 'Always pair an algorithm with its error analysis and convergence rate. Use concrete floating-point examples to motivate why numerical stability matters. Show worked computations by hand for small cases before discussing implementation.' },
  game_theory:            { label: 'Game Theory',              systemPromptHint: 'Open with a concrete strategic scenario (2-player normal-form game, payoff matrix). Use specific numeric examples to compute equilibria by hand. Emphasize when rational individual behavior leads to collectively suboptimal outcomes.' },
  networks:               { label: 'Networks',                 systemPromptHint: 'Draw small example networks to ground every definition. Connect structural properties (degree distribution, clustering) to real-world phenomena (internet, social networks, epidemics). Use Erdős-Rényi as the baseline random model before introducing power laws.' },
  graph_theory:           { label: 'Graph Theory',             systemPromptHint: 'Always draw a small example graph (5–8 vertices) before stating a theorem. Use combinatorial counting arguments alongside algebraic ones. Connect theorems to algorithmic applications — e.g. coloring to scheduling, matching to assignment problems.' },
  algorithms:             { label: 'Algorithms',               systemPromptHint: 'Trace through a concrete small input by hand before analyzing complexity. Use recurrence relations for divide-and-conquer. Draw recursion trees and DP tables. Distinguish worst-case, average-case, and amortized analysis clearly.' },
  number_theory:          { label: 'Number Theory',            systemPromptHint: 'Use small numeric examples to reveal the pattern before stating the theorem. Show how elementary number theory underlies modern cryptography. Emphasize the interplay between divisibility, congruences, and the structure of ℤ/nℤ.' },
  differential_geometry:  { label: 'Differential Geometry',    systemPromptHint: 'Ground everything in familiar surfaces: sphere, torus, saddle. Use the intrinsic vs. extrinsic distinction early. Visualize parallel transport with concrete paths on a sphere. Connect curvature to the behavior of geodesics and the topology of the surface.' },
  computability:          { label: 'Computability Theory',     systemPromptHint: 'Use thought experiments and informal English descriptions of machines before writing formal encodings. Make the diagonalization argument visceral — self-referential paradoxes are the heart of this subject. Connect undecidability to everyday limitations of software.' },
  set_theory:             { label: 'Set Theory',               systemPromptHint: "Build intuition for infinite sizes with concrete bijections (ℕ ↔ ℤ ↔ ℚ, then Cantor's diagonal argument). Make ordinal arithmetic tangible with small examples. Emphasize how the Axiom of Choice is equivalent to seemingly unrelated statements." },
  fourier_analysis:       { label: 'Fourier Analysis',         systemPromptHint: 'Use sound and signal processing as the primary physical intuition — frequencies, harmonics, filtering. Show the Fourier series converging on a square wave visually. Connect the continuous and discrete transforms explicitly. Emphasize the uncertainty principle as a deep duality.' },
}

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

function buildSystemPrompt(subject) {
  const s = SUBJECTS[subject] || SUBJECTS['real_analysis']
  return `You are an expert ${s.label} lecturer producing a structured lecture deck JSON.

SUBJECT CONTEXT: ${s.systemPromptHint}

${QUALITY_STANDARD}

${LATEX_CONVENTIONS}

${SLIDE_TYPES}

${SLIDE_SCHEMA}`
}

function buildPrompt(concept, context, subject) {
  const s = SUBJECTS[subject] || SUBJECTS['real_analysis']
  let p = `Generate a complete lecture deck for the ${s.label} concept: **${concept}**`
  if (context?.trim()) p += `\n\nAdditional context / constraints:\n${context.trim()}`
  p += '\n\nReturn ONLY valid JSON. No markdown. No code fences.'
  return p
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { concept, context, subject } = req.body || {}
  if (!concept?.trim()) {
    return res.status(400).json({ error: 'concept is required' })
  }

  const redisUrl        = process.env.UPSTASH_REDIS_REST_URL
  const redisToken      = process.env.UPSTASH_REDIS_REST_TOKEN
  const supabaseUrl     = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  // --- Identity ---
  const authHeader = req.headers['authorization'] || ''
  let userId = null
  let isAuthenticated = false

  if (authHeader.startsWith('Bearer ') && supabaseUrl && supabaseAnonKey) {
    try {
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { Authorization: authHeader, apikey: supabaseAnonKey },
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        userId = userData.id
        isAuthenticated = true
      }
    } catch { /* fall through to unauthenticated */ }
  }

  if (!userId) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
    userId = `anon:${ip}`
  }

  // --- Cache lookup (hits are free — no rate limit charge) ---
  const cacheKey = `deck:${subject || 'real_analysis'}:${concept.trim().toLowerCase()}`
  if (redisUrl && redisToken) {
    try {
      const getRes = await fetch(`${redisUrl}/get/${encodeURIComponent(cacheKey)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      })
      const getJson = await getRes.json()
      if (getJson.result) return res.status(200).json(JSON.parse(getJson.result))
    } catch { /* cache miss — proceed */ }
  }

  // --- Rate limit check ---
  let tier = 'free'
  if (isAuthenticated) tier = await getSubscriptionTier(userId, authHeader, supabaseUrl, supabaseAnonKey)
  const limit = isAuthenticated ? (LIMITS[tier] ?? 10) : 3
  const today = new Date().toISOString().slice(0, 10)
  const rateLimitKey = `ratelimit:${userId}:${today}`
  let used = 0

  if (redisUrl && redisToken) {
    try {
      const countRes = await fetch(`${redisUrl}/get/${encodeURIComponent(rateLimitKey)}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      })
      const countJson = await countRes.json()
      used = parseInt(countJson.result || '0', 10)
    } catch { /* proceed */ }

    if (used >= limit) {
      return res.status(429).json({ error: `Daily limit of ${limit} generations reached. Try again tomorrow.` })
    }
  }

  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: missing Groq API key' })
  }

  let groqRes
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: buildSystemPrompt(subject || 'real_analysis') },
          { role: 'user',   content: buildPrompt(concept, context, subject || 'real_analysis') },
        ],
        max_tokens: 8192,
        temperature: 0.3,
      }),
    })
  } catch (err) {
    return res.status(502).json({ error: `Failed to reach Groq: ${err.message}` })
  }

  if (groqRes.status === 429) {
    return res.status(429).json({ error: 'Rate limit reached. Please try again in a moment.' })
  }

  if (!groqRes.ok) {
    const body = await groqRes.text()
    return res.status(502).json({ error: `Groq error ${groqRes.status}: ${body.slice(0, 300)}` })
  }

  let groqData
  try {
    groqData = await groqRes.json()
  } catch {
    return res.status(502).json({ error: 'Groq returned non-JSON response' })
  }

  const raw = groqData.choices?.[0]?.message?.content || ''
  let clean = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  const jsonMatch = clean.match(/\{[\s\S]*\}/)
  if (jsonMatch) clean = jsonMatch[0]

  // Always pre-process backslashes before parsing.
  // LaTeX commands like \frac, \forall start with chars that are valid JSON escapes
  // (\f = form-feed, \b = backspace) so JSON.parse would silently corrupt them.
  // This regex doubles any lone backslash (not already escaped) that isn't a
  // recognised JSON escape: \", \\, \/, or \uXXXX.
  const fixed = clean.replace(/(?<!\\)\\(?!["\\\/]|u[0-9a-fA-F]{4})/g, '\\\\')

  let parsed
  try {
    parsed = JSON.parse(fixed)
  } catch {
    // Last resort: try the raw string (handles models that already double-escape).
    try {
      parsed = JSON.parse(clean)
    } catch {
      return res.status(502).json({ error: `Model returned invalid JSON (${raw.length} chars). Preview: ${raw.slice(0, 300)}` })
    }
  }

  // --- Increment rate limit counter (TTL = seconds until next midnight UTC) ---
  if (redisUrl && redisToken) {
    try {
      await fetch(`${redisUrl}/incr/${encodeURIComponent(rateLimitKey)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}` },
      })
      const now = new Date()
      const midnight = new Date(now)
      midnight.setUTCHours(24, 0, 0, 0)
      const ttl = Math.ceil((midnight - now) / 1000)
      await fetch(`${redisUrl}/expire/${encodeURIComponent(rateLimitKey)}/${ttl}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}` },
      })
    } catch { /* non-fatal */ }
  }

  // --- Log usage to Supabase (fire-and-forget, authenticated users only) ---
  if (isAuthenticated && supabaseUrl && supabaseAnonKey) {
    fetch(`${supabaseUrl}/rest/v1/usage_logs`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ user_id: userId, subject: subject || 'real_analysis', concept: concept.trim(), cached: false }),
    }).catch(() => {})
  }

  // Store in cache only if the deck is valid (has slides) — prevents caching broken responses
  if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    return res.status(502).json({ error: 'Model returned an empty deck. Please try again.' })
  }

  if (redisUrl && redisToken) {
    try {
      await fetch(`${redisUrl}/set/${encodeURIComponent(cacheKey)}?ex=${60 * 60 * 24 * 7}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(JSON.stringify(parsed)),
      })
    } catch { /* non-fatal */ }
  }

  return res.status(200).json(parsed)
}
