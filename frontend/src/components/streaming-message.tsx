import { useState, useEffect } from "react"
import { Loader2, Bot } from "lucide-react"

interface StreamingMessageProps {
  content: string
  isStreaming: boolean
  timestamp: Date
}

// Simple markdown-to-JSX converter for basic formatting
const formatMarkdown = (text: string) => {
  if (!text) return text

  // Handle code blocks first (```code```)
  const codeBlockRegex = /```([\s\S]*?)```/g
  const parts = []
  let lastIndex = 0
  let codeBlockMatch

  while ((codeBlockMatch = codeBlockRegex.exec(text)) !== null) {
    // Add content before code block
    if (codeBlockMatch.index > lastIndex) {
      const beforeText = text.substring(lastIndex, codeBlockMatch.index)
      parts.push(...formatRegularText(beforeText))
    }

    // Add code block
    parts.push(
      <pre key={`codeblock-${codeBlockMatch.index}`} className="bg-muted-foreground/10 border rounded-lg p-3 my-3 overflow-x-auto">
        <code className="text-sm font-mono text-foreground">
          {codeBlockMatch[1].trim()}
        </code>
      </pre>
    )

    lastIndex = codeBlockMatch.index + codeBlockMatch[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex)
    parts.push(...formatRegularText(remainingText))
  }

  return parts.length > 0 ? parts : formatRegularText(text)
}

// Format regular text (non-code-block content)
const formatRegularText = (text: string) => {
  // Split by lines to handle line breaks
  const lines = text.split('\n')
  
  return lines.map((line, lineIndex) => {
    // Handle block quotes
    if (line.startsWith('> ')) {
      const content = line.substring(2)
      return (
        <blockquote key={lineIndex} className="border-l-4 border-primary/30 pl-4 py-2 bg-muted/50 rounded-r mb-2">
          {formatInlineMarkdown(content)}
        </blockquote>
      )
    }

    // Handle headers
    if (line.startsWith('### ')) {
      return <h3 key={lineIndex} className="text-lg font-semibold mt-4 mb-2">{line.substring(4)}</h3>
    }
    if (line.startsWith('## ')) {
      return <h2 key={lineIndex} className="text-xl font-semibold mt-4 mb-2">{line.substring(3)}</h2>
    }
    if (line.startsWith('# ')) {
      return <h1 key={lineIndex} className="text-2xl font-bold mt-4 mb-2">{line.substring(2)}</h1>
    }

    // Handle empty lines
    if (line.trim() === '') {
      return <br key={lineIndex} />
    }    // Handle list items
    if (line.match(/^\s*[-*+]\s/)) {
      const content = line.replace(/^\s*[-*+]\s/, '')
      return (
        <div key={lineIndex} className="flex items-start gap-2 mb-1">
          <span className="text-primary mt-1">•</span>
          <span>{formatInlineMarkdown(content)}</span>
        </div>
      )
    }

    // Handle numbered lists
    if (line.match(/^\s*(\d+)\.\s/)) {
      const match = line.match(/^\s*(\d+)\.\s/)
      const number = match ? match[1] : '1'
      const content = line.replace(/^\s*\d+\.\s/, '')
      return (
        <div key={lineIndex} className="flex items-start gap-2 mb-1">
          <span className="text-primary mt-1 font-medium">{number}.</span>
          <span>{formatInlineMarkdown(content)}</span>
        </div>
      )
    }

    // Regular paragraphs
    return (
      <p key={lineIndex} className="mb-2">
        {formatInlineMarkdown(line)}
      </p>
    )
  })
}

// Handle inline formatting (bold, italic, code)
const formatInlineMarkdown = (text: string) => {
  const parts = []
  let currentIndex = 0
  
  // Pattern to match **bold**, *italic*, and `code`
  const markdownRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let match
  
  while ((match = markdownRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index))
    }
    
    const matchedText = match[1]
    
    // Handle bold **text**
    if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      parts.push(
        <strong key={`bold-${match.index}`} className="font-semibold">
          {matchedText.slice(2, -2)}
        </strong>
      )
    }
    // Handle italic *text*
    else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
      parts.push(
        <em key={`italic-${match.index}`} className="italic">
          {matchedText.slice(1, -1)}
        </em>
      )
    }    // Handle code `text`
    else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
      parts.push(
        <code key={`code-${match.index}`} className="bg-muted-foreground/10 border px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
          {matchedText.slice(1, -1)}
        </code>
      )
    }
    
    currentIndex = match.index + matchedText.length
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex))
  }
  
  return parts.length > 0 ? parts : text
}

export function StreamingMessage({ content, isStreaming, timestamp }: StreamingMessageProps) {
  const [showCursor, setShowCursor] = useState(true)

  // Cursor blinking effect
  useEffect(() => {
    if (!isStreaming) {
      setShowCursor(false)
      return
    }

    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 500)

    return () => clearInterval(interval)
  }, [isStreaming])
  return (    <div className="flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%]">
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center mt-1">
        <Bot className="w-3 h-3 md:w-4 md:h-4 text-primary-foreground" />
      </div>
      
      {/* Message Content */}
      <div className="bg-muted p-3 md:p-4 rounded-lg flex-1">
        <div className="flex-1">
          {isStreaming && !content ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <div className="relative">
              <div className="text-sm leading-relaxed">
                {formatMarkdown(content)}
                {isStreaming && showCursor && (
                  <span 
                    className="inline-block w-0.5 h-5 bg-foreground ml-1 transition-opacity duration-300"
                    style={{ opacity: showCursor ? 1 : 0 }}
                  />
                )}
              </div>
            </div>
          )}
          <span className="text-xs opacity-70 mt-3 block">
            {timestamp.toLocaleTimeString()}
            {isStreaming && (
              <span className="ml-2 text-blue-500">● typing...</span>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
