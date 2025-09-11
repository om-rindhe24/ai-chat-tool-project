"use client"

import { useState, useEffect } from "react"

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    // Generate a session ID for this browser session
    const existingSessionId = sessionStorage.getItem("chat-session-id")
    if (existingSessionId) {
      setSessionId(existingSessionId)
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem("chat-session-id", newSessionId)
      setSessionId(newSessionId)
    }
  }, [])

  const clearSession = () => {
    sessionStorage.removeItem("chat-session-id")
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem("chat-session-id", newSessionId)
    setSessionId(newSessionId)
  }

  return { sessionId, clearSession }
}
