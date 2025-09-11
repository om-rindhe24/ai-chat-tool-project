import { streamText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(req: Request) {
  try {
    console.log("[v0] API route called")

    const { messages } = await req.json()

    console.log("[v0] Messages received:", messages?.length || 0)

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      console.log("[v0] Invalid messages format")
      return new Response("Invalid messages format", { status: 400 })
    }

    const validMessages = messages.filter((message: any) => message.content && message.content.trim().length > 0)

    console.log("[v0] About to call streamText with Gemini")
    console.log("[v0] Valid messages:", JSON.stringify(validMessages, null, 2))

    const result = await streamText({
      model: google("gemini-1.5-flash"),
      messages: validMessages,
      system: `You are a helpful, friendly AI assistant. You provide clear, accurate, and helpful responses. 
      Keep your responses conversational and engaging while being informative. 
      If you're unsure about something, acknowledge it honestly.`,
      maxTokens: 1000,
      temperature: 0.7,
    })

    console.log("[v0] streamText completed, returning stream response")

    return result.toTextStreamResponse()
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    return new Response(`Internal server error: ${error.message}`, { status: 500 })
  }
}
