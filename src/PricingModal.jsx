import React, { useState } from 'react'
import { C, FONT, btn } from './styles.js'
import { PLANS, startCheckout } from './billing.js'

export default function PricingModal({ currentTier, token, onClose }) {
  const [loading, setLoading] = useState(null) // priceId of plan being purchased
  const [error, setError] = useState(null)

  const handleSubscribe = async (priceId) => {
    setLoading(priceId)
    setError(null)
    try {
      await startCheckout(priceId, token)
    } catch (e) {
      setError(e.message)
      setLoading(null)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(12, 17, 32, 0.85)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '16px', padding: '36px', width: '100%', maxWidth: '600px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', color: C.gold, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: FONT.sans, marginBottom: '10px' }}>
            Upgrade your plan
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '400', color: C.text, fontFamily: FONT.serif, margin: 0 }}>
            Generate more. Learn more.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {Object.entries(PLANS).map(([key, plan]) => {
            const isCurrent = currentTier === key
            const isPro = key === 'pro'
            return (
              <div
                key={key}
                style={{
                  background: isPro ? C.gold + '12' : C.surfaceLight,
                  border: `1px solid ${isPro ? C.gold + '50' : C.border}`,
                  borderRadius: '12px', padding: '24px',
                  display: 'flex', flexDirection: 'column', gap: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: isPro ? C.gold : C.text, fontFamily: FONT.sans }}>
                      {plan.name}
                    </span>
                    {isPro && (
                      <span style={{ fontSize: '10px', background: C.gold, color: C.bg, padding: '2px 7px', borderRadius: '100px', fontFamily: FONT.sans, fontWeight: '700', letterSpacing: '0.06em' }}>
                        BEST VALUE
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '28px', fontWeight: '700', color: C.text, fontFamily: FONT.sans }}>{plan.price}</span>
                    <span style={{ fontSize: '13px', color: C.muted, fontFamily: FONT.sans }}>{plan.period}</span>
                  </div>
                </div>

                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: '13px', color: C.textDim, fontFamily: FONT.sans, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: isPro ? C.gold : C.defGreen, flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={!!loading || isCurrent}
                  style={{
                    marginTop: 'auto',
                    width: '100%', padding: '11px',
                    border: 'none', borderRadius: '8px',
                    fontFamily: FONT.sans, fontSize: '14px', fontWeight: '600',
                    cursor: loading || isCurrent ? 'not-allowed' : 'pointer',
                    background: isCurrent ? C.border : isPro ? C.gold : C.surfaceLight,
                    color: isCurrent ? C.muted : isPro ? C.bg : C.text,
                    border: isCurrent ? 'none' : isPro ? 'none' : `1px solid ${C.border}`,
                    opacity: loading && loading !== plan.priceId ? 0.5 : 1,
                  }}
                >
                  {isCurrent ? 'Current plan' : loading === plan.priceId ? 'Redirecting…' : `Subscribe to ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>

        {error && (
          <div style={{ background: C.red + '15', border: `1px solid ${C.red}40`, color: C.red, borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontFamily: FONT.sans, marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button onClick={onClose} style={{ ...btn('ghost'), fontSize: '13px' }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
