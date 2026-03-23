const PRICE_TIERS = {
  'price_1TDXYwGbIMfhP5gTjrFw5XOy': 'basic',
  'price_1TDXZiGbIMfhP5gTAhGnLhez': 'pro',
}

function stripePost(path, params, secretKey) {
  const body = new URLSearchParams(params).toString()
  return fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  }).then(r => r.json())
}

function stripeGet(path, secretKey) {
  return fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  }).then(r => r.json())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl     = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const stripeKey       = process.env.STRIPE_SECRET_KEY

  if (!stripeKey) return res.status(500).json({ error: 'Stripe not configured' })

  const authHeader = req.headers['authorization'] || ''
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: supabaseAnonKey },
  })
  if (!userRes.ok) return res.status(401).json({ error: 'Unauthorized' })
  const user = await userRes.json()

  const { priceId } = req.body || {}
  if (!priceId || !PRICE_TIERS[priceId]) return res.status(400).json({ error: 'Invalid priceId' })

  // Get or create Stripe customer
  let stripeCustomerId = null
  const subRes = await fetch(
    `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${user.id}&select=stripe_customer_id`,
    { headers: { Authorization: authHeader, apikey: supabaseAnonKey } }
  )
  if (subRes.ok) {
    const subs = await subRes.json()
    stripeCustomerId = subs[0]?.stripe_customer_id || null
  }

  if (!stripeCustomerId) {
    const customer = await stripePost('/customers', {
      email: user.email,
      'metadata[user_id]': user.id,
    }, stripeKey)
    if (customer.error) return res.status(502).json({ error: customer.error.message })
    stripeCustomerId = customer.id

    await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ user_id: user.id, stripe_customer_id: stripeCustomerId, tier: 'free', status: 'active' }),
    })
  }

  const origin = req.headers.origin || 'https://math-lecture-deck.vercel.app'
  const session = await stripePost('/checkout/sessions', {
    customer: stripeCustomerId,
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/?checkout_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/?checkout_cancelled=1`,
    'subscription_data[metadata][user_id]': user.id,
  }, stripeKey)

  if (session.error) return res.status(502).json({ error: session.error.message })
  return res.status(200).json({ url: session.url })
}
