import React, { useState, useCallback, useEffect } from 'react'
import SetupScreen from './SetupScreen.jsx'
import SlideshowScreen from './SlideshowScreen.jsx'
import AuthScreen from './AuthScreen.jsx'
import { callAPI } from './prompt.js'
import { decodeDeckFromHash } from './share.js'
import { getSession, onAuthChange, signOut } from './auth.js'

export default function App() {
  const [session,   setSession]   = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress,  setProgress]  = useState('')
  const [error,     setError]     = useState(null)

  // Lazy init: check URL hash for a shared deck
  const [deck, setDeck] = useState(() => {
    const hash = window.location.hash
    if (hash.startsWith('#deck=')) return decodeDeckFromHash(hash)
    return null
  })

  // Auth init
  useEffect(() => {
    getSession().then(s => {
      setSession(s)
      setAuthReady(true)
    })
    const unsub = onAuthChange(s => setSession(s))
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
      const result = await callAPI(concept, context, subject, setProgress)
      setDeck({ ...result, subject })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
      setProgress('')
    }
  }, [])

  // Called when a deck is loaded from library or JSON import
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
      onSignOut={signOut}
      onGenerate={handleGenerate}
      onLoad={handleLoad}
      isLoading={isLoading}
      progress={progress}
      error={error}
    />
  )
}
