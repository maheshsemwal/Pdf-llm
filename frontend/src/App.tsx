import { ThemeProvider } from "@/components/theme-provider"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ChatInterface } from "@/components/chat-interface"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/chat/:chatId" element={<ChatInterface />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App