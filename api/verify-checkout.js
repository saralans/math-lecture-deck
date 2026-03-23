const PRICE_TIERS = {
  'price_1TDXYwGbIMfhP5gTjrFw5XOy': 'basic',
  'price_1TDXZiGbIMfhP5gTAhGnLhez': 'pro',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl     = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const stripeKey       = process.env.STRIPE_SECRET_KEY

  const authHeader = req.headers['authorization'] || ''
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: supabaseAnonKey },
  })
  if (!userRes.ok) return res.status(401).json({ error: 'Unauthorized' })
  const user = await userRes.json()

  const { sessionId } = req.body || {}
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  // Retrieve checkout session + expand subscription
  const session = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=subscription`,
    { headers: { Authorization: `Bearer ${stripeKey}` } }
  ).then(r => r.json())

  if (session.error) return res.status(502).json({ error: session.error.message })
  if (session.payment_status !== 'paid') return res.status(400).json({ error: 'Payment not completed' })

  const subscription = session.subscription
  const priceId = subscription.items?.data[0]?.price?.id
  const tier = PRICE_TIERS[priceId] || 'basic'

  await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      user_id:                user.id,
      stripe_customer_id:     session.customer,
      stripe_subscription_id: subscription.id,
      tier,
      status:                 subscription.status,
      current_period_end:     new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at:             new Date().toISOString(),
    }),
  })

  return res.status(200).json({ tier, status: subscription.status })
}
