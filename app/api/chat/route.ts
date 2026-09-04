import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamText } from "ai"

const systemPrompt = `You are a helpful, friendly AI assistant. You provide clear, accurate, and helpful responses.
Keep your responses conversational and engaging while being informative.
If you're unsure about something, acknowledge it honestly.`

type ChatMessage = {
  role: "user" | "assistant" | "system"
  content: string
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Partial<ChatMessage>
  return (
    (message.role === "user" || message.role === "assistant" || message.role === "system") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  )
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return new Response("Gemini API key is not configured on the server", { status: 503 })
    }

    const body = (await request.json()) as { messages?: unknown }
    const messages = Array.isArray(body.messages) ? body.messages.filter(isChatMessage) : []

    if (messages.length === 0) {
      return new Response("No valid messages provided", { status: 400 })
    }

    const result = streamText({
      model: createGoogleGenerativeAI({ apiKey })("gemini-2.5-flash"),
      system: systemPrompt,
      messages,
      maxOutputTokens: 1000,
      temperature: 0.7,
      abortSignal: AbortSignal.timeout(25000),
      onError: ({ error }) => {
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    if (error instanceof SyntaxError) return new Response("Invalid request body", { status: 400 })
    if (error instanceof Error && error.name === "AbortError") {
      return new Response("Request timeout - please try again", { status: 408 })
    }
    return new Response("Unable to generate a response right now", { status: 500 })
  }
}
