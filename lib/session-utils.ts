// Utility functions for session management

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function getSessionIdFromHeaders(headers: Headers): string | null {
  return headers.get("x-session-id")
}

export function createSessionHeaders(sessionId: string): Record<string, string> {
  return {
    "x-session-id": sessionId,
  }
}
