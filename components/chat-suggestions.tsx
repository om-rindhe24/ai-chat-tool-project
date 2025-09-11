"use client"

import { Button } from "@/components/ui/button"

interface ChatSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void
}

const suggestions = [
  "What can you help me with?",
  "Tell me a fun fact",
  "Help me write an email",
  "Explain quantum computing",
  "What's the weather like?",
  "Write a short story",
]

export function ChatSuggestions({ onSuggestionClick }: ChatSuggestionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
      {suggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSuggestionClick(suggestion)}
          className="text-left justify-start h-auto py-3 px-4 text-sm bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
        >
          {suggestion}
        </Button>
      ))}
    </div>
  )
}
