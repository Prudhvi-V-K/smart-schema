"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import ReactMarkdown from "react-markdown"
import type { GeneratedSchema } from "@/app/page"

interface ExportPanelProps {
  schema: GeneratedSchema | null
  onSchemaChange?: (schema: GeneratedSchema) => void
}

export default function ExportPanel({ schema, onSchemaChange }: ExportPanelProps) {
  const [explanation, setExplanation] = useState<string>("")
  const [isExplaining, setIsExplaining] = useState(false)
  const [message, setMessage] = useState("")
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [isSending, setIsSending] = useState(false)
  const [pendingSchema, setPendingSchema] = useState<GeneratedSchema | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  const canEdit = typeof onSchemaChange === "function"

  // Helper functions for localStorage chat persistence
  const getChatStorageKey = (timestamp: string) => `schema-chat-${timestamp}`
  
  const loadChatFromStorage = (timestamp: string): { role: "user" | "assistant"; content: string }[] => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(getChatStorageKey(timestamp))
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  
  const saveChatToStorage = (timestamp: string, chatHistory: { role: "user" | "assistant"; content: string }[]) => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(getChatStorageKey(timestamp), JSON.stringify(chatHistory))
    } catch {
      // Ignore storage errors
    }
  }
  
  // Track if we've fetched explanation for a timestamp (stored in localStorage)
  const getExplanationFetchedKey = (timestamp: string) => `explanation-fetched-${timestamp}`
  
  // Load explanation and chat when schema timestamp changes (new schema)
  useEffect(() => {
    if (!schema) {
      setExplanation("")
      setIsExplaining(false)
      setChat([])
      return
    }
    
    const currentTimestamp = schema.timestamp
    
    // Always restore explanation from schema if available (should always be the case now)
    if (schema.explanation) {
      setExplanation(schema.explanation)
      setIsExplaining(false)
    } else {
      // Fallback: generate explanation if not included (backward compatibility)
      // Only fetch if we haven't already fetched for this timestamp
      const fetchedKey = getExplanationFetchedKey(currentTimestamp)
      const alreadyFetched = typeof window !== "undefined" && localStorage.getItem(fetchedKey)
      
      if (!alreadyFetched) {
        setIsExplaining(true)
        const run = async () => {
          try {
            const res = await fetch("/api/explain-schema", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ schema }),
            })
            if (!res.ok) throw new Error("Failed to get explanation")
            const data = await res.json()
            setExplanation(data.explanation)
            // Mark as fetched
            if (typeof window !== "undefined") {
              localStorage.setItem(fetchedKey, "true")
            }
          } catch (e) {
            setExplanation("Could not generate explanation. Please try again.")
          } finally {
            setIsExplaining(false)
          }
        }
        run()
      } else {
        // Already fetched, but not in schema - this shouldn't happen, but set loading to false
        setIsExplaining(false)
      }
    }
    
    // Always restore chat history from localStorage for this schema
    const savedChat = loadChatFromStorage(currentTimestamp)
    setChat(savedChat)
  }, [schema?.timestamp]) // Only run when timestamp changes (new schema)
  
  // Restore explanation and chat when component mounts with existing schema
  useEffect(() => {
    if (!schema) return
    
    const currentTimestamp = schema.timestamp
    
    // If explanation state is empty but schema has explanation, restore it
    if (!explanation && schema.explanation) {
      setExplanation(schema.explanation)
      setIsExplaining(false)
    }
    
    // If chat is empty but we have saved chat, restore it
    if (chat.length === 0) {
      const savedChat = loadChatFromStorage(currentTimestamp)
      if (savedChat.length > 0) {
        setChat(savedChat)
      }
    }
  }, [schema]) // Run whenever schema object changes (including on mount)
  
  // Save chat to localStorage whenever it changes
  useEffect(() => {
    if (schema?.timestamp && chat.length > 0) {
      saveChatToStorage(schema.timestamp, chat)
    }
  }, [chat, schema?.timestamp])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [chat])

  if (!schema) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground">No schema defined yet. Generate a schema in the Generator tab.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSend = async () => {
    if (!schema) return
    const content = message.trim()
    if (!content) return
    const userMessage = content
    setMessage("")
    const newChatWithUser = [...chat, { role: "user" as const, content: userMessage }]
    setChat(newChatWithUser)
    
    try {
      setIsSending(true)
      const res = await fetch("/api/schema-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          schema, 
          message: userMessage,
          chatHistory: chat.map(m => ({ role: m.role, content: m.content }))
        }),
      })
      if (!res.ok) throw new Error("Failed to send message")
      const data = await res.json()
      if (data.reply) {
        setChat((c) => [...c, { role: "assistant", content: data.reply }])
      }
      if (data.updatedSchema && canEdit) {
        // Show confirmation dialog before applying changes
        setPendingSchema(data.updatedSchema)
        setShowConfirmDialog(true)
      }
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: "Sorry, I couldn't process that request. Please try again." }])
    } finally {
      setIsSending(false)
    }
  }

  const handleConfirmSchemaChange = () => {
    if (pendingSchema && onSchemaChange) {
      onSchemaChange(pendingSchema)
      setChat((c) => [...c, { 
        role: "assistant", 
        content: "✅ Schema changes have been applied successfully!" 
      }])
    }
    setShowConfirmDialog(false)
    setPendingSchema(null)
  }

  const handleCancelSchemaChange = () => {
    setShowConfirmDialog(false)
    setPendingSchema(null)
    setChat((c) => [...c, { 
      role: "assistant", 
      content: "Schema changes were cancelled. You can continue asking questions or request different changes." 
    }])
  }

  return (
    <div className="p-6 space-y-6">
      {/* Explanation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Architecture Recommendation & Rationale</CardTitle>
          <CardDescription>
            Suitable database choice for your project and why the relationships are modeled this way
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert dark:prose-invert max-w-none text-sm">
            {isExplaining ? (
              <p className="text-muted-foreground">Generating explanation...</p>
            ) : (
              <ReactMarkdown>{explanation}</ReactMarkdown>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Section */}
      <Card>
        <CardHeader>
          <CardTitle>Ask Questions & Modify Schema</CardTitle>
         
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={listRef} className="h-64 overflow-y-auto rounded-md border border-border p-4 space-y-4 bg-muted/30">
            {chat.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ask a question or request a change to the schema.</p>
            ) : (
              chat.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col gap-1 ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <span className="text-xs uppercase text-muted-foreground px-2">
                    {m.role === "user" ? "You" : "Assistant"}
                  </span>
                  <div
                    className={`rounded-lg px-3 py-2 max-w-[80%] prose prose-invert dark:prose-invert prose-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border"
                    }`}
                  >
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              className="flex-1 min-h-[60px] resize-none"
              placeholder="Ask a question or propose a change (e.g., 'Why is this relationship modeled this way?' or 'Add an email column to the users table')"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              rows={2}
            />
            <Button onClick={handleSend} disabled={isSending || !message.trim()}>
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
          {!canEdit && (
            <p className="text-xs text-muted-foreground">Note: Updates are view-only here. Open this panel from the main page to enable live schema updates.</p>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Schema Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              The assistant has suggested changes to your schema. Would you like to apply these changes? This will update your current schema and may affect the ER diagram and generated scripts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSchemaChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSchemaChange}>Apply Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
