import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ModeToggle } from "@/components/mode-toggle"
import { StreamingMessage } from "@/components/streaming-message"
import { 
  Send, 
  Upload, 
  FileText, 
  MessageSquare, 
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiService } from "@/services/api"
import { userService } from "@/services/user"
import type { Chat } from "@/services/api"

interface LocalMessage {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
  isLoading?: boolean
  isStreaming?: boolean
}

export function ChatInterface() {
  const { chatId } = useParams<{ chatId: string }>()
  const navigate = useNavigate()
  
  // Responsive sidebar: default closed on mobile (< 768px), open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check if screen is mobile and set initial sidebar state
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Auto-hide on mobile, show on desktop
      if (mobile && sidebarOpen) {
        setSidebarOpen(false)
      } else if (!mobile && !sidebarOpen) {
        setSidebarOpen(true)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarOpen) {
        const sidebar = document.getElementById('sidebar')
        const target = event.target as Node
        if (sidebar && !sidebar.contains(target)) {
          setSidebarOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobile, sidebarOpen])
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize user ID
  useEffect(() => {
    setCurrentUserId(userService.getUserId())
  }, [])

  // Load all chats on component mount
  useEffect(() => {
    loadChats()
  }, [])

  // Load specific chat when chatId changes
  useEffect(() => {
    if (chatId) {
      loadChatWithMessages(chatId)
    } else {
      setCurrentChat(null)
      setMessages([])
    }
  }, [chatId])

  const loadChats = async () => {
    try {
      const loadedChats = await apiService.getAllChats()
      setChats(loadedChats)
    } catch (error) {
      console.error('Failed to load chats:', error)
      setError('Failed to load chats')
    }
  }

  const loadChatWithMessages = async (id: string) => {
    try {
      const chatWithMessages = await apiService.getChatWithMessages(id)
      setCurrentChat(chatWithMessages.chat)
      setMessages(chatWithMessages.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.created_at)
      })))
      setError(null)
    } catch (error) {      console.error('Failed to load chat:', error)
      setError('Failed to load chat')
    }
  }

  const createNewChat = () => {
    navigate('/chat')
    setCurrentChat(null)
    setMessages([])
    // Auto-close sidebar on mobile after creating new chat
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const resetUser = async () => {
    const newUserId = userService.resetUserId()
    setCurrentUserId(newUserId)
    setChats([])
    setCurrentChat(null)
    setMessages([])
    navigate('/chat')
    await loadChats()
  }

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || file.type !== "application/pdf") return

    setIsUploading(true)
    setError(null)

    try {
      // Upload PDF to backend
      const uploadResult = await apiService.uploadPdf(file)      // Create new chat in database
      const newChat = await apiService.createChat(
        file.name.replace('.pdf', ''),
        uploadResult.document_id,  // Use document_id for database reference
        uploadResult.file_id       // Use file_id for vector search
      )      // Update local state
      setChats(prev => [newChat, ...prev])
      setCurrentChat(newChat)
      setMessages([])
      
      // Navigate to the new chat
      navigate(`/chat/${newChat.id}`)
      
    } catch (error) {
      console.error('Failed to upload PDF:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload PDF')
    } finally {
      setIsUploading(false)
      // Reset file input
      event.target.value = ''    }
  }
  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentChat || isLoading) return

    const userMessage: LocalMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date()
    }

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage])
    const questionText = inputMessage
    setInputMessage("")
    setIsLoading(true)

    // Add streaming message for assistant
    const streamingMessageId = (Date.now() + 1).toString()
    const streamingMessage: LocalMessage = {
      id: streamingMessageId,
      content: "",
      sender: "assistant",
      timestamp: new Date(),
      isStreaming: true
    }
    setMessages(prev => [...prev, streamingMessage])

    try {
      // Store user message in database
      await apiService.sendMessage(currentChat.id, userMessage.content, "user")

      let fullResponse = ""

      // Get AI response with streaming
      await apiService.askQuestionStream(
        currentChat.file_id || '',
        questionText,
        // onChunk: Update the streaming message content
        (chunk: string) => {
          fullResponse += chunk
          setMessages(prev => prev.map(msg => 
            msg.id === streamingMessageId 
              ? { ...msg, content: fullResponse }
              : msg
          ))
        },
        // onComplete: Mark streaming as finished
        () => {
          setMessages(prev => prev.map(msg => 
            msg.id === streamingMessageId 
              ? { ...msg, isStreaming: false }
              : msg
          ))
          
          // Store assistant message in database
          apiService.sendMessage(currentChat.id, fullResponse, "assistant")
            .catch(error => console.error('Failed to store assistant message:', error))
        },
        // onError: Handle errors
        (error: string) => {
          console.error('Streaming error:', error)
          setMessages(prev => prev.map(msg => 
            msg.id === streamingMessageId 
              ? { 
                  ...msg, 
                  content: "Sorry, I encountered an error processing your question. Please try again.",
                  isStreaming: false 
                }
              : msg
          ))
          setError('Failed to get response')
        }
      )

    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove streaming message and show error
      setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId))
      
      const errorMessage: LocalMessage = {
        id: (Date.now() + 3).toString(),
        content: "Sorry, I encountered an error processing your question. Please try again.",
        sender: "assistant",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      
      setError('Failed to get response')
    } finally {
      setIsLoading(false)
    }
  }
  const selectChat = (chat: Chat) => {
    navigate(`/chat/${chat.id}`)
    // Auto-close sidebar on mobile after selecting a chat
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const deleteChat = async (chatToDelete: Chat) => {
    try {
      await apiService.deleteChat(chatToDelete.id)
      setChats(prev => prev.filter(chat => chat.id !== chatToDelete.id))
      
      // If we're deleting the current chat, navigate away
      if (currentChat?.id === chatToDelete.id) {
        navigate('/chat')
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
      setError('Failed to delete chat')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault()
      sendMessage()
    }  }
  return (
    <div className="relative flex h-screen bg-background overflow-hidden chat-container"
         style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* Backdrop overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        id="sidebar"
        className={cn(
          "flex flex-col bg-background border-r transition-all duration-300 z-50",
          // Mobile: Fixed positioning with overlay
          "md:relative md:translate-x-0",
          isMobile ? "fixed left-0 top-0 h-full" : "relative",
          sidebarOpen 
            ? "w-80 translate-x-0" 
            : isMobile 
              ? "w-80 -translate-x-full" 
              : "w-0 overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Chat History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4">
          <Button 
            onClick={createNewChat} 
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2">
            {chats.map((chat) => (
              <div key={chat.id} className="group relative">
                <Button
                  variant={currentChat?.id === chat.id ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto p-3 pr-10"
                  onClick={() => selectChat(chat)}
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm font-medium truncate">
                        {chat.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(chat.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteChat(chat)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>      {/* Main Content */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between p-2 md:p-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-xl font-semibold">
              {currentChat?.title || "PDF-LLM"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-mono text-xs">{currentUserId}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetUser}
                className="h-6 px-2 text-xs"
              >
                Reset User
              </Button>
            </div>
            <ModeToggle />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm sticky top-[73px] z-10">
            {error}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-auto p-0"
              onClick={() => setError(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}        {/* Chat Area - Scrollable content between fixed header and input */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {!currentChat ? (
            /* Upload Area */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-6 max-w-md">
                <div className="space-y-2">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="text-2xl font-semibold">Upload a PDF to start</h3>
                  <p className="text-muted-foreground">
                    Upload a PDF document to begin asking questions and get AI-powered insights.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <label htmlFor="pdf-upload">
                    <Button asChild className="cursor-pointer" disabled={isUploading}>
                      <div>
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? "Uploading..." : "Choose PDF File"}
                      </div>
                    </Button>
                  </label>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </div>
              </div>
            </div>          ) : (            /* Chat Messages */
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-2 md:p-4 min-h-0">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Ready to chat!</h3>
                      <p className="text-muted-foreground">
                        Ask any question about your uploaded PDF: <strong>{currentChat.title}</strong>
                      </p>
                    </div>                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}                        className={cn(
                          "flex gap-2 md:gap-3",
                          message.sender === "user" 
                            ? "justify-end" 
                            : "justify-start"
                        )}
                      >                        {message.sender === "assistant" ? (
                          <StreamingMessage
                            content={message.content}
                            isStreaming={message.isStreaming || false}
                            timestamp={message.timestamp}
                          />
                        ) : (                          <div className="flex gap-2 md:gap-3 justify-end">
                            <div className="bg-primary text-primary-foreground p-3 md:p-4 rounded-lg max-w-[85%] md:max-w-[80%]">
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <span className="text-xs opacity-70 mt-2 block">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>                            <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-secondary rounded-full flex items-center justify-center mt-1">
                              <User className="w-3 h-3 md:w-4 md:h-4 text-secondary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
              </div>              {/* Input Area - Fixed at bottom */}
              <div className="border-t p-2 md:p-4 bg-background flex-shrink-0">
                <div className="max-w-4xl mx-auto">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask a question about your PDF..."
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                      />
                    </div>
                    <Button 
                      onClick={sendMessage} 
                      disabled={!inputMessage.trim() || isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Current PDF: {currentChat.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteChat(currentChat)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Delete Chat
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
