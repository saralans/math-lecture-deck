export const PLANS = {
  basic: {
    name:    'Basic',
    price:   '$19.99',
    period:  '/mo',
    limit:   '50 decks / day',
    priceId: 'price_1TDXYwGbIMfhP5gTjrFw5XOy',
    features: ['50 lecture decks per day', 'Cloud library sync', 'All 20 subjects', 'Export to PDF, LaTeX, Markdown'],
  },
  pro: {
    name:    'Pro',
    price:   '$29.99',
    period:  '/mo',
    limit:   'Unlimited',
    priceId: 'price_1TDXZiGbIMfhP5gTAhGnLhez',
    features: ['Unlimited lecture decks', 'Cloud library sync', 'All 20 subjects', 'Export to PDF, LaTeX, Markdown', 'Priority generation speed'],
  },
}

export async function startCheckout(priceId, token) {
  const res = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ priceId }),
  })
  if (!res.ok) throw new Error('Failed to start checkout')
  const { url } = await res.json()
  window.location.href = url
}

export async function verifyCheckout(sessionId, token) {
  const res = await fetch('/api/verify-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function openPortal(token) {
  const res = await fetch('/api/create-portal', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to open billing portal')
  const { url } = await res.json()
  window.location.href = url
}
