import React, { useState, useCallback, useEffect } from 'react'
import SetupScreen from './SetupScreen.jsx'
import SlideshowScreen from './SlideshowScreen.jsx'
import AuthScreen from './AuthScreen.jsx'
import { callAPI, getQuota } from './prompt.js'
import { verifyCheckout, openPortal } from './billing.js'
import { saveToLibrary } from './library.js'
import { decodeDeckFromHash } from './share.js'
import { getSession, onAuthChange, signOut, processOAuthHash } from './auth.js'

export default function App() {
  const [session,   setSession]   = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress,  setProgress]  = useState('')
  const [error,     setError]     = useState(null)
  const [quota,     setQuota]     = useState(null)

  // Lazy init: check URL hash for a shared deck
  const [deck, setDeck] = useState(() => {
    const hash = window.location.hash
    if (hash.startsWith('#deck=')) return decodeDeckFromHash(hash)
    return null
  })

  useEffect(() => {
    const unsub = onAuthChange(async (s) => {
      setSession(s)
      setAuthReady(true)
      if (s?.access_token) {
        const pending = sessionStorage.getItem('_pendingVerify')
        if (pending) {
          sessionStorage.removeItem('_pendingVerify')
          await verifyCheckout(pending, s.access_token)
        }
        getQuota(s.access_token).then(setQuota)
      }
    })

    // Handle Stripe checkout return
    const params = new URLSearchParams(window.location.search)
    const checkoutSessionId = params.get('checkout_session_id')
    if (checkoutSessionId) {
      window.history.replaceState(null, '', window.location.pathname)
      // Token may not be ready yet — wait for auth to settle, then verify
      const doVerify = async (token) => {
        if (!token) return
        await verifyCheckout(checkoutSessionId, token)
        getQuota(token).then(setQuota)
      }
      // Will be called again once session is set in onAuthChange
      sessionStorage.setItem('_pendingVerify', checkoutSessionId)
    }

    if (window.location.hash.includes('access_token=')) {
      // OAuth redirect: tokens are in the URL hash. Explicitly set the
      // session from them — don't wait on Supabase's async event timing.
      processOAuthHash()
        .then(s => { if (s) { setSession(s); setAuthReady(true) } })
        .catch(() => setAuthReady(true))
    } else {
      getSession().then(s => { setSession(s); setAuthReady(true) })
    }

    return unsub
  }, [])

  // Clear hash from URL after loading a shared deck (no server hit)
  useEffect(() => {
    if (deck && window.location.hash.startsWith('#deck=')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [deck])

  const handleGenerate = useCallback(async (concept, context, subject) => {
    setIsLoading(true)
    setError(null)
    setDeck(null)
    try {
      const result = await callAPI(concept, context, subject, setProgress, session?.access_token)
      saveToLibrary(result, subject)
      setDeck({ ...result, subject })
      getQuota(session?.access_token).then(setQuota)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
      setProgress('')
    }
  }, [])

  const handleLoad = useCallback((loadedDeck, subject) => {
    setDeck({ ...loadedDeck, subject: subject || loadedDeck.subject || 'real_analysis' })
    setError(null)
  }, [])

  if (!authReady) return null

  if (!session) return <AuthScreen />

  if (deck) {
    return (
      <SlideshowScreen
        deck={deck}
        onReset={() => setDeck(null)}
        onDeckChange={setDeck}
      />
    )
  }

  return (
    <SetupScreen
      user={session.user}
      token={session.access_token}
      onSignOut={signOut}
      onGenerate={handleGenerate}
      onLoad={handleLoad}
      onManageBilling={() => openPortal(session.access_token)}
      isLoading={isLoading}
      progress={progress}
      error={error}
      quota={quota}
    />
  )
}
