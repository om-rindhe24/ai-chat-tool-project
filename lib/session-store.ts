// Simple in-memory session store for chat history
// In production, you might want to use Redis or a database

interface ChatSession {
  id: string
  messages: Array<{
    role: "user" | "assistant"
    content: string
    timestamp: Date
  }>
  lastActivity: Date
}

class SessionStore {
  private sessions = new Map<string, ChatSession>()
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

  constructor() {
    // Clean up expired sessions every 5 minutes
    setInterval(
      () => {
        this.cleanupExpiredSessions()
      },
      5 * 60 * 1000,
    )
  }

  createSession(sessionId: string): ChatSession {
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      lastActivity: new Date(),
    }
    this.sessions.set(sessionId, session)
    return session
  }

  getSession(sessionId: string): ChatSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    // Check if session is expired
    if (Date.now() - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId)
      return null
    }

    return session
  }

  updateSession(sessionId: string, messages: ChatSession["messages"]): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.messages = messages
      session.lastActivity = new Date()
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now()
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId)
      }
    }
  }

  getSessionCount(): number {
    return this.sessions.size
  }
}

// Export singleton instance
export const sessionStore = new SessionStore()
