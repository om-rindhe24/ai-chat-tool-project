"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

const Copy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const ThumbsUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h3.73a2 2 0 0 1 1.92 2.56z" />
  </svg>
)

const ThumbsDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 14V2" />
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h-3.73a2 2 0 0 1-1.92-2.56z" />
  </svg>
)

interface MessageActionsProps {
  content: string
  messageId: string
}

export function MessageActions({ content, messageId }: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handleFeedback = (type: "up" | "down") => {
    setFeedback(type)
    // In a real app, you'd send this feedback to your analytics service
    console.log(`Feedback for message ${messageId}: ${type}`)
  }

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-6 px-2 text-xs">
        <Copy />
        <span className="ml-1">{copied ? "Copied!" : "Copy"}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback("up")}
        className={`h-6 px-2 ${feedback === "up" ? "text-green-600" : ""}`}
      >
        <ThumbsUp />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback("down")}
        className={`h-6 px-2 ${feedback === "down" ? "text-red-600" : ""}`}
      >
        <ThumbsDown />
      </Button>
    </div>
  )
}
