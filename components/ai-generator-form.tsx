"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Wand2, Loader2, Sparkles, Database } from "lucide-react"
import { Orbitron } from "next/font/google"
import type { GeneratedSchema } from "@/app/page"

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "600", "700"] })

interface AIGeneratorFormProps {
  onSchemaGenerated: (schema: GeneratedSchema) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  projectId?: string | null
}

export default function AIGeneratorForm({ onSchemaGenerated, isLoading, setIsLoading, projectId }: AIGeneratorFormProps) {
  const [description, setDescription] = useState(
    "Generate a database for a student management system with students, courses, enrollments, grades, and faculty members",
  )
  const [error, setError] = useState<string | null>(null)

  const handleGenerateSchema = async () => {
    if (!description.trim()) {
      setError("Please describe your database requirements")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Sending schema generation request to API")
      const response = await fetch("/api/generate-schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          description,
          projectId: projectId || null,
          saveToDatabase: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] API Error Response:", errorData)
        throw new Error(errorData.error || "Failed to generate schema")
      }

      const generatedSchema = await response.json()
      console.log("[v0] Schema generated successfully:", generatedSchema)
      onSchemaGenerated(generatedSchema)
    } catch (err) {
      console.error("[v0] Schema generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate schema")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Transform your database requirements into a complete, production-ready schema with AI-powered architecture insights
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="space-y-2 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text font-semibold">
              Describe Your Project
            </span>
          </CardTitle>
          <CardDescription className="text-base">
            Provide a detailed description of your database requirements. Be specific about entities, relationships, and business logic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Database className="w-4 h-4" />
              Project Description
            </label>
            <Textarea
              placeholder="Example: Create a student management system with students, courses, enrollments, grades, and faculty members. Students can enroll in multiple courses, and each enrollment has grades. Faculty members teach courses and can access their students' grades..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="resize-none min-h-[200px] text-base leading-relaxed border-2 focus:border-primary/50 transition-colors bg-background/50"
              disabled={isLoading}
            />
         
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
              <span className="text-destructive">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleGenerateSchema}
            disabled={isLoading || !description.trim()}
            size="lg"
            className="w-full gap-2 h-12 text-base font-semibold blue-500 hover:blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Your Schema...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>Generate Schema with AI</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info Cards */}
      {!isLoading && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border border-primary/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Wand2 className="w-5 h-5" />
                <span className="font-semibold">AI-Powered</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Advanced AI analyzes your requirements and generates optimized database schemas
              </p>
            </CardContent>
          </Card>
          <Card className="border border-primary/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Database className="w-5 h-5" />
                <span className="font-semibold">Complete Schema</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Get tables, relationships, constraints, and detailed explanations in one go
              </p>
            </CardContent>
          </Card>
          <Card className="border border-primary/20 bg-gradient-to-br from-pink-500/5 to-transparent">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Production-Ready</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Export to SQL, Prisma, or Drizzle ORM formats for immediate use
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
