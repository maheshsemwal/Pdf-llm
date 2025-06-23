import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ModeToggle } from "@/components/mode-toggle"
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
}

export function ChatInterface() {
  const { chatId } = useParams<{ chatId: string }>()
  const navigate = useNavigate()
  
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
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
    } catch (error) {
      console.error('Failed to load chat:', error)
      setError('Failed to load chat')
    }
  }
  const createNewChat = () => {
    navigate('/chat')
    setCurrentChat(null)
    setMessages([])
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
      event.target.value = ''
    }
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
    setInputMessage("")
    setIsLoading(true)

    // Add loading message for assistant
    const loadingMessage: LocalMessage = {
      id: (Date.now() + 1).toString(),
      content: "",
      sender: "assistant",
      timestamp: new Date(),
      isLoading: true
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      // Store user message in database
      await apiService.sendMessage(currentChat.id, userMessage.content, "user")      // Get AI response
      const response = await apiService.askQuestion(
        currentChat.file_id || '',
        inputMessage
      )

      // Remove loading message and add actual response
      setMessages(prev => prev.filter(msg => !msg.isLoading))

      const assistantMessage: LocalMessage = {
        id: (Date.now() + 2).toString(),
        content: response.answer,
        sender: "assistant",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Store assistant message in database
      await apiService.sendMessage(currentChat.id, response.answer, "assistant")

    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove loading message and show error
      setMessages(prev => prev.filter(msg => !msg.isLoading))
      
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
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "flex flex-col border-r bg-background transition-all duration-300",
        sidebarOpen ? "w-80" : "w-0 overflow-hidden"
      )}>
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
        </div>        <ScrollArea className="flex-1 px-4">
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
      <div className="flex flex-col flex-1 h-screen">        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
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
        )}

        {/* Chat Area - Scrollable content between fixed header and input */}
        <div className="flex-1 flex flex-col overflow-hidden">
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
            </div>          ) : (
            /* Chat Messages */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Ready to chat!</h3>
                      <p className="text-muted-foreground">
                        Ask any question about your uploaded PDF: <strong>{currentChat.title}</strong>
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3 p-4 rounded-lg",
                          message.sender === "user" 
                            ? "bg-primary text-primary-foreground ml-auto max-w-[80%]" 
                            : "bg-muted max-w-[80%]"
                        )}
                      >
                        <div className="flex-1">
                          {message.isLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Thinking...</span>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                          <span className="text-xs opacity-70 mt-2 block">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area - Fixed at bottom */}
              <div className="border-t p-4 bg-background sticky bottom-0">
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
