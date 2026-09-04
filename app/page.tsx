"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageActions } from "@/components/message-actions"

// Simple SVG components replacing lucide-react icons
const Send = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
)

const Bot = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="m9 16 0 0" />
    <path d="m15 16 0 0" />
  </svg>
)

const User = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const Trash2 = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
)

const TypewriterText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, 20) // Adjust speed here (lower = faster)

      return () => clearTimeout(timer)
    } else if (onComplete && currentIndex === text.length) {
      onComplete()
    }
  }, [currentIndex, text, onComplete])

  useEffect(() => {
    // Reset when text changes
    setDisplayedText("")
    setCurrentIndex(0)
  }, [text])

  return (
    <span>
      {displayedText}
      {currentIndex < text.length && <span className="animate-pulse bg-blue-500 w-0.5 h-4 inline-block ml-0.5" />}
    </span>
  )
}

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  isTyping?: boolean
  displayedContent?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input
    if (!textToSend.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setStreamingContent("")
    setIsStreaming(true)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      console.log("[v0] Sending message to API")

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal, // Added abort signal for timeout handling
      })

      clearTimeout(timeoutId) // Clear timeout if request succeeds

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      console.log("[v0] Got response, starting to read stream")

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body reader available")
      }

      const decoder = new TextDecoder()

      let fullContent = ""
      let assistantMessageId: string | null = null
      let lastUpdateTime = Date.now()

      const streamTimeoutId = setInterval(() => {
        if (Date.now() - lastUpdateTime > 10000) {
          console.log("[v0] Stream timeout detected")
          void reader.cancel()
          clearInterval(streamTimeoutId)
        }
      }, 1000)

      try {
        while (true) {
          const { done, value } = await reader.read()
          const chunk = value ? decoder.decode(value, { stream: !done }) : ""
          if (chunk) {
            fullContent += chunk
            lastUpdateTime = Date.now()
            if (!assistantMessageId) {
              assistantMessageId = `${Date.now()}-assistant`
              setMessages((prev) => [
                ...prev,
                { id: assistantMessageId!, content: fullContent, role: "assistant", timestamp: new Date(), isTyping: true },
              ])
            } else {
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg)),
              )
            }
            setStreamingContent(fullContent)
          }
          if (done) {
            console.log("[v0] Stream reading completed; characters received:", fullContent.length)
            clearInterval(streamTimeoutId)
            if (assistantMessageId) {
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullContent, isTyping: false } : msg)),
              )
            }
            if (!fullContent) throw new Error("The server returned an empty response")
            setIsStreaming(false)
            break
          }
        }
      } catch (streamError) {
        clearInterval(streamTimeoutId)
        throw streamError
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId) // Ensure timeout is cleared on error
      console.error("[v0] Error in sendMessage:", error)

      const errorName = error instanceof Error ? error.name : ""
      const errorDetails = error instanceof Error ? error.message : String(error)
      let errorMessage = "Sorry, I encountered an error. Please try again."
      if (errorName === "AbortError") {
        errorMessage = "Request timed out. Please try again with a shorter message."
      } else if (errorDetails.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your connection and try again."
      } else if (errorDetails.includes("Gemini API key is not configured")) {
        errorMessage = "Gemini is not configured for this deployment. Add GOOGLE_GENERATIVE_AI_API_KEY to the Preview environment and redeploy."
      } else if (errorDetails.includes("HTTP error")) {
        errorMessage = errorDetails.split("message: ")[1] || "Server error. Please try again in a moment."
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: errorMessage,
          role: "assistant",
          timestamp: new Date(),
        },
      ])
      setIsStreaming(false)
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatMessage = (content: string, isTyping = false) => {
    // Split content into paragraphs and format them
    const paragraphs = content.split("\n\n").filter((p) => p.trim())

    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim()

      // Check if it's a list item
      if (trimmed.match(/^[\d\-*•]\s/)) {
        const listContent = trimmed.replace(/^[\d\-*•]\s/, "")
        return (
          <div key={index} className="my-2">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-medium mt-1">•</span>
              <span className="flex-1">
                {isTyping && index === paragraphs.length - 1 ? <TypewriterText text={listContent} /> : listContent}
              </span>
            </div>
          </div>
        )
      }

      // Check if it's a heading (starts with #)
      if (trimmed.startsWith("#")) {
        const level = trimmed.match(/^#+/)?.[0].length || 1
        const text = trimmed.replace(/^#+\s*/, "")
        const headingClass =
          level === 1
            ? "text-lg font-bold mb-3 text-blue-600 dark:text-blue-400"
            : level === 2
              ? "text-base font-semibold mb-2 text-blue-600 dark:text-blue-400"
              : "text-sm font-medium mb-2 text-blue-600 dark:text-blue-400"

        return (
          <div key={index} className={headingClass}>
            {isTyping && index === paragraphs.length - 1 ? <TypewriterText text={text} /> : text}
          </div>
        )
      }

      // Regular paragraph
      return (
        <p key={index} className="mb-3 last:mb-0 leading-relaxed">
          {isTyping && index === paragraphs.length - 1 ? <TypewriterText text={trimmed} /> : trimmed}
        </p>
      )
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="container mx-auto max-w-4xl p-2 sm:p-4 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 pt-2 sm:pt-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-blue-200 dark:ring-blue-800">
              <Bot />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-4">
                OM AI-CHATBOX
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                Powered by Gemini 2.5 Flash
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="flex items-center gap-1 sm:gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 shadow-sm text-xs sm:text-sm px-2 sm:px-3"
            >
              <Trash2 />
              <span className="hidden sm:inline">Clear Chat</span>
              <span className="sm:hidden">Clear</span>
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-0 shadow-2xl ring-1 ring-gray-200/50 dark:ring-gray-700/50">
          <ScrollArea className="flex-1 p-3 sm:p-6" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 sm:space-y-6 px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-2 sm:mb-4 shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/50">
                  <Bot />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-3">
                    Welcome to OM AI-CHATBOX
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md text-sm sm:text-base leading-relaxed">
                    Start a conversation with our intelligent AI assistant. Ask questions, get help, or explore ideas
                    together!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 sm:gap-3 group ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                        <Bot />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white shadow-lg"
                          : "bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      <div className="text-sm leading-relaxed">
                        {message.role === "assistant" ? (
                          <div className="space-y-1">{formatMessage(message.content, message.isTyping)}</div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 sm:mt-3 pt-1 sm:pt-2 border-t border-gray-200/30 dark:border-gray-600/30">
                        <p
                          className={`text-xs opacity-70 ${
                            message.role === "user" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {message.role === "assistant" && !message.isTyping && (
                        <MessageActions content={message.content} messageId={message.id} />
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                        <User />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                      <Bot />
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl px-4 py-3 border border-blue-200 dark:border-gray-600">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">OM AI is thinking</span>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3 sm:p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-700/50">
            <div className="flex gap-2 sm:gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything"
                className="flex-1 bg-white/90 dark:bg-gray-800/90 border-gray-300/50 dark:border-gray-600/50 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 px-3 sm:px-4"
              >
                <Send />
              </Button>
            </div>
            <div className="mt-3 text-center">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                OM AI-CHATBOX processes your message with safety checks and intelligent response
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
