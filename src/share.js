export function encodeDeckToHash(deck) {
  const bytes = new TextEncoder().encode(JSON.stringify(deck))
  let binary = ''
  bytes.forEach(b => binary += String.fromCharCode(b))
  return btoa(binary)
}

export function decodeDeckFromHash(hash) {
  try {
    const b64 = hash.replace(/^#?deck=/, '')
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}
