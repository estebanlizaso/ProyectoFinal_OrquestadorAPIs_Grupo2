import { useEffect, useState } from 'react'
import { TYPEWRITER_CHAR_INTERVAL_MS } from './constants'

export type UseTypewriterResult = {
  visibleText: string
  isTyping: boolean
}

export function useTypewriter(text: string, isEnabled: boolean): UseTypewriterResult {
  const [visibleLength, setVisibleLength] = useState(isEnabled ? 0 : text.length)
  const isTyping = visibleLength < text.length

  useEffect(() => {
    if (!isTyping) {
      return
    }
    const timeoutId = setTimeout(() => setVisibleLength((length) => length + 1), TYPEWRITER_CHAR_INTERVAL_MS)
    return () => clearTimeout(timeoutId)
  }, [isTyping, visibleLength])

  return { visibleText: text.slice(0, visibleLength), isTyping }
}
