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

  const subRes = await fetch(
    `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${user.id}&select=stripe_customer_id`,
    { headers: { Authorization: authHeader, apikey: supabaseAnonKey } }
  )
  if (!subRes.ok) return res.status(404).json({ error: 'No subscription found' })
  const subs = await subRes.json()
  const stripeCustomerId = subs[0]?.stripe_customer_id
  if (!stripeCustomerId) return res.status(404).json({ error: 'No Stripe customer found' })

  const origin = req.headers.origin || 'https://math-lecture-deck.vercel.app'
  const portal = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ customer: stripeCustomerId, return_url: origin }).toString(),
  }).then(r => r.json())

  if (portal.error) return res.status(502).json({ error: portal.error.message })
  return res.status(200).json({ url: portal.url })
}
