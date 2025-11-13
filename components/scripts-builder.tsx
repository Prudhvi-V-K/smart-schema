"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Download, Loader2, CheckCircle2 } from "lucide-react"
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
import { generateAllCodeFormats } from "@/lib/code-generator"
import { toast } from "sonner"
import type { GeneratedSchema } from "@/app/page"

interface ScriptsBuilderProps {
  schema: GeneratedSchema | null
  projectId?: string | null
  onSchemaChange?: (schema: GeneratedSchema) => void
}

export default function ScriptsBuilder({ schema, projectId, onSchemaChange }: ScriptsBuilderProps) {
  const [selectedTab, setSelectedTab] = useState<"sql" | "prisma" | "drizzle">("sql")
  const [selectedDialect, setSelectedDialect] = useState<"postgresql" | "mysql" | "sqlite">("postgresql")
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [isSending, setIsSending] = useState(false)
  const [pendingSchema, setPendingSchema] = useState<GeneratedSchema | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const chatListRef = useRef<HTMLDivElement | null>(null)

  // Helper functions for localStorage chat persistence
  const getChatStorageKey = (timestamp: string) => `schema-modify-chat-${timestamp}`
  
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

  // Load chat when schema changes
  useEffect(() => {
    if (!schema) {
      setChat([])
      return
    }
    const currentTimestamp = schema.timestamp
    const savedChat = loadChatFromStorage(currentTimestamp)
    setChat(savedChat)
  }, [schema?.timestamp])

  // Save chat to localStorage whenever it changes
  useEffect(() => {
    if (schema?.timestamp && chat.length > 0) {
      saveChatToStorage(schema.timestamp, chat)
    }
  }, [chat, schema?.timestamp])

  useEffect(() => {
    if (!chatListRef.current) return
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight
  }, [chat])

  const getCode = () => {
    if (!schema) return ""

    const codeFormats = generateAllCodeFormats(schema)

    if (selectedTab === "prisma") return codeFormats.prisma
    if (selectedTab === "drizzle") return codeFormats.drizzle
    return codeFormats.sql[selectedDialect]
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const downloadFile = (text: string, filename: string) => {
    const element = document.createElement("a")
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text))
    element.setAttribute("download", filename)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
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
      if (data.updatedSchema && onSchemaChange) {
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

  const handleConfirmSchemaChange = async () => {
    if (!pendingSchema || !onSchemaChange) {
      setShowConfirmDialog(false)
      setPendingSchema(null)
      return
    }

    // If projectId is available, save to MongoDB
    if (projectId) {
      setIsSaving(true)
      try {
        // Generate all code formats for the updated schema
        const codeFormats = generateAllCodeFormats(pendingSchema)

        // Update the schema timestamp
        const updatedSchema = {
          ...pendingSchema,
          timestamp: new Date().toISOString(),
        }

        // Save to MongoDB
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schema: updatedSchema,
            explanation: updatedSchema.explanation || schema?.explanation || null,
            codeFormats,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to save schema changes to database")
        }

        // Update local schema state
        onSchemaChange(updatedSchema)

        // Show success notification
        toast.success("Schema Updated Successfully!", {
          description: "Your schema changes have been saved to the database.",
          icon: <CheckCircle2 className="w-5 h-5" />,
          duration: 5000,
        })

        setChat((c) => [...c, { 
          role: "assistant", 
          content: "✅ Schema changes have been applied and saved to your project!" 
        }])
      } catch (error) {
        console.error("Failed to save schema changes:", error)
        toast.error("Failed to Save Changes", {
          description: error instanceof Error ? error.message : "Could not save schema changes to database.",
          duration: 5000,
        })
        setChat((c) => [...c, { 
          role: "assistant", 
          content: "❌ Failed to save schema changes to database. The changes were applied locally but not saved." 
        }])
      } finally {
        setIsSaving(false)
      }
    } else {
      // No projectId, just update local state
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

  if (!schema?.tables || schema.tables.length === 0) {
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

  const code = getCode()
  const extension = selectedTab === "sql" ? "sql" : selectedTab === "prisma" ? "prisma" : "ts"

  return (
    <div className="p-6 space-y-6">
      {/* Tab Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Code Generation</CardTitle>
          <CardDescription>Generate schema code in your preferred format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {["sql", "prisma", "drizzle"].map((tab) => (
              <Button
                key={tab}
                variant={selectedTab === tab ? "default" : "outline"}
                onClick={() => setSelectedTab(tab as any)}
                className="capitalize"
              >
                {tab}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialect Selector for SQL */}
      {selectedTab === "sql" && (
        <Card>
          <CardHeader>
            <CardTitle>SQL Dialect</CardTitle>
            <CardDescription>Choose your database dialect</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {["postgresql", "mysql", "sqlite"].map((dialect) => (
                <Button
                  key={dialect}
                  variant={selectedDialect === dialect ? "default" : "outline"}
                  onClick={() => setSelectedDialect(dialect as any)}
                  className="capitalize"
                >
                  {dialect}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Code Display */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedTab === "sql"
              ? "CREATE TABLE Statements"
              : selectedTab === "prisma"
                ? "Prisma Schema"
                : "Drizzle Schema"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted p-4 rounded-lg font-mono text-sm max-h-96 overflow-auto border border-border">
            <pre className="text-foreground whitespace-pre-wrap break-words">{code}</pre>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2 bg-transparent" onClick={() => copyToClipboard(code)}>
              <Copy className="w-4 h-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 bg-transparent"
              onClick={() => downloadFile(code, `schema.${extension}`)}
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat Section for Schema Modifications */}
      <Card>
        <CardHeader>
          <CardTitle>Modify Schema</CardTitle>
          <CardDescription>Ask the AI to modify your schema or answer questions about code generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={chatListRef} className="h-64 overflow-y-auto rounded-md border border-border p-4 space-y-4 bg-muted/30">
            {chat.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ask to modify your schema or get help with code generation (e.g., 'Add an email column to the users table' or 'Why is this SQL generated this way?').</p>
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
              placeholder="Request a schema change or ask a question (e.g., 'Add an email column to the users table' or 'Explain this SQL query')"
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
          {!onSchemaChange && (
            <p className="text-xs text-muted-foreground">Note: Schema modifications require a project to be selected.</p>
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
            <AlertDialogCancel onClick={handleCancelSchemaChange} disabled={isSaving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSchemaChange} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Apply Changes"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
