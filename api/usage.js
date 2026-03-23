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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl     = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const redisUrl        = process.env.UPSTASH_REDIS_REST_URL
  const redisToken      = process.env.UPSTASH_REDIS_REST_TOKEN

  // Identity
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
    } catch { /* fall through */ }
  }

  if (!userId) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
    userId = `anon:${ip}`
  }

  let tier = 'free'
  if (isAuthenticated) tier = await getSubscriptionTier(userId, authHeader, supabaseUrl, supabaseAnonKey)
  const limit = isAuthenticated ? (LIMITS[tier] === Infinity ? 999999 : (LIMITS[tier] ?? 10)) : 3
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
  }

  const displayLimit = LIMITS[tier] === Infinity ? null : limit  // null = unlimited
  return res.status(200).json({ used, limit, remaining: Math.max(0, limit - used), isAuthenticated, tier })
}
