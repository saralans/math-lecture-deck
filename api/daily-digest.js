const GITHUB_REPO = 'saralans/math-lecture-deck'

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = req.headers['authorization'] === `Bearer ${cronSecret}`
  const isManualTest = req.query.secret === cronSecret && cronSecret

  if (!isVercelCron && !isManualTest) {
    return res.status(401).end()
  }

  const groqKey = process.env.GROQ_API_KEY
  const resendKey = process.env.RESEND_API_KEY
  const toEmail = process.env.DIGEST_TO_EMAIL

  // 1. Fetch TODAY.md from GitHub (public repo, no auth needed)
  let todayNotes = ''
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/TODAY.md`)
    if (r.ok) todayNotes = (await r.text()).trim()
  } catch {}

  // 2. Fetch today's commits from GitHub API
  const todayMidnightUTC = new Date()
  todayMidnightUTC.setUTCHours(0, 0, 0, 0)
  let commits = []
  try {
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/commits?since=${todayMidnightUTC.toISOString()}&per_page=30`,
      { headers: { 'User-Agent': 'math-lecture-deck-digest' } }
    )
    if (r.ok) {
      const data = await r.json()
      commits = Array.isArray(data) ? data.map(c => c.commit.message.split('\n')[0]) : []
    }
  } catch {}

  const hasNotes = todayNotes.length > 0
  const hasCommits = commits.length > 0

  // If nothing to report, send a nudge
  if (!hasNotes && !hasCommits) {
    const nudgeHtml = `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px;color:#1a1a2e;background:#f9f7f2;">
        <h2 style="color:#c9973a;font-size:22px;margin:0 0 16px;">No activity logged today</h2>
        <p style="color:#555;line-height:1.7;">No TODAY.md notes found and no commits pushed. Ship something tomorrow!</p>
        <p style="color:#999;font-size:12px;margin-top:32px;">Math Lecture Deck · Daily Digest</p>
      </div>`
    await sendEmail(resendKey, toEmail, `Dev Digest — No Activity`, nudgeHtml)
    return res.status(200).json({ ok: true, sent: 'nudge' })
  }

  // 3. AI-generate the digest sections
  const prompt = `You are a personal dev digest generator for a solo founder building Math Lecture Deck Generator (https://math-lecture-deck.vercel.app) — a web app that generates academic math lecture slides using AI (Groq), with Supabase auth, Redis caching, Stripe billing, and Vercel hosting.

Today's data:
${hasNotes ? `\n=== TODAY.md NOTES ===\n${todayNotes}\n` : '(No manual notes today — derive from commits only)'}
${hasCommits ? `\n=== GIT COMMITS ===\n${commits.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n` : '(No commits today)'}

Return a JSON object with exactly these fields:
{
  "session_summary": "2-3 sentence plain English summary of what was worked on",
  "time_estimate": "estimated hours worked (e.g. '~2h') or 'unknown' if no signals",
  "accomplishments": ["concrete thing done 1", "concrete thing done 2"],
  "changelog_entry": "1-2 sentence user-facing changelog entry (e.g. 'Added X. Fixed Y.'). Write for a math educator audience.",
  "user_announcement": "2-3 sentence friendly announcement a user would appreciate — focuses on benefit to them, not technical details",
  "ship_queue": ["item that seems ready to announce or deploy"],
  "tomorrow_priorities": ["top priority 1", "top priority 2", "top priority 3"]
}

Return only valid JSON, no markdown fences, no extra text.`

  let digest
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await r.json()
    const raw = data.choices[0].message.content.trim()
    digest = JSON.parse(raw)
  } catch (e) {
    return res.status(500).json({ error: 'AI generation failed', detail: e.message })
  }

  // 4. Build and send email
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York'
  })
  const html = buildEmailHTML(today, digest, todayNotes, commits)
  await sendEmail(resendKey, toEmail, `Dev Digest — ${today}`, html)

  return res.status(200).json({ ok: true, sent: 'digest', sections: Object.keys(digest) })
}

async function sendEmail(apiKey, to, subject, html) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Dev Digest <onboarding@resend.dev>',
      to,
      subject,
      html
    })
  })
}

function buildEmailHTML(today, d, rawNotes, commits) {
  const gold = '#c9973a'
  const navy = '#0c1120'
  const cream = '#f9f7f2'
  const muted = '#666'
  const border = '#e0d8cc'

  const bullets = (items) =>
    (items || []).map(i => `<li style="margin-bottom:6px;line-height:1.6;">${esc(i)}</li>`).join('')

  const section = (title, content) => `
    <div style="margin-bottom:28px;">
      <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:${gold};font-family:system-ui,sans-serif;margin-bottom:10px;">${title}</div>
      ${content}
    </div>`

  const pill = (text, color = gold) =>
    `<span style="display:inline-block;background:${color}22;color:${color};border:1px solid ${color}44;border-radius:100px;padding:2px 10px;font-size:11px;font-family:system-ui,sans-serif;font-weight:600;">${esc(text)}</span>`

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eee;">
<div style="max-width:620px;margin:32px auto;background:${cream};border:1px solid ${border};border-radius:12px;overflow:hidden;">

  <!-- Header -->
  <div style="background:${navy};padding:28px 32px;border-bottom:2px solid ${gold};">
    <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${gold};font-family:system-ui,sans-serif;margin-bottom:6px;">Math Lecture Deck · Daily Digest</div>
    <div style="font-size:22px;color:#fff;font-family:Georgia,serif;font-weight:400;">${esc(today)}</div>
    <div style="font-size:13px;color:#aaa;font-family:system-ui,sans-serif;margin-top:6px;">Time worked: <strong style="color:#fff;">${esc(d.time_estimate || 'unknown')}</strong></div>
  </div>

  <!-- Body -->
  <div style="padding:32px;color:${navy};font-family:Georgia,serif;">

    ${section('What you built today',
      `<p style="margin:0;line-height:1.75;font-size:15px;color:#333;">${esc(d.session_summary)}</p>`
    )}

    ${section('Accomplishments',
      `<ul style="margin:0;padding-left:20px;font-size:14px;color:#333;">${bullets(d.accomplishments)}</ul>`
    )}

    ${section('Changelog entry <span style="font-size:10px;color:#999;font-family:system-ui,sans-serif;">(ready to paste)</span>',
      `<div style="background:#fff;border:1px solid ${border};border-left:3px solid ${gold};border-radius:6px;padding:14px 16px;font-size:14px;line-height:1.7;color:#333;">${esc(d.changelog_entry)}</div>`
    )}

    ${section('User announcement draft <span style="font-size:10px;color:#999;font-family:system-ui,sans-serif;">(modal / email / social)</span>',
      `<div style="background:#fff;border:1px solid ${border};border-left:3px solid #4a90d9;border-radius:6px;padding:14px 16px;font-size:14px;line-height:1.7;color:#333;">${esc(d.user_announcement)}</div>`
    )}

    ${d.ship_queue && d.ship_queue.length > 0 ? section('Ship queue',
      `<div style="display:flex;flex-wrap:wrap;gap:8px;">${(d.ship_queue || []).map(i => pill(i, '#2d9e5f')).join('')}</div>`
    ) : ''}

    ${section('Tomorrow\'s top 3',
      `<ol style="margin:0;padding-left:20px;font-size:14px;color:#333;">${(d.tomorrow_priorities || []).map(i => `<li style="margin-bottom:6px;line-height:1.6;">${esc(i)}</li>`).join('')}</ol>`
    )}

    ${commits.length > 0 ? section(`Commits today (${commits.length})`,
      `<ul style="margin:0;padding-left:20px;font-size:12px;color:${muted};font-family:monospace;">${commits.map(c => `<li style="margin-bottom:4px;">${esc(c)}</li>`).join('')}</ul>`
    ) : ''}

    ${rawNotes ? section('Your TODAY.md notes',
      `<pre style="margin:0;background:#fff;border:1px solid ${border};border-radius:6px;padding:14px 16px;font-size:12px;line-height:1.6;color:${muted};white-space:pre-wrap;font-family:monospace;">${esc(rawNotes)}</pre>`
    ) : ''}

  </div>

  <!-- Footer -->
  <div style="background:#f0ece4;border-top:1px solid ${border};padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#999;font-family:system-ui,sans-serif;">Math Lecture Deck · <a href="https://math-lecture-deck.vercel.app" style="color:${gold};text-decoration:none;">math-lecture-deck.vercel.app</a></p>
  </div>

</div>
</body>
</html>`
}

function esc(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
