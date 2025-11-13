"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Download } from "lucide-react"
import { generateAllCodeFormats } from "@/lib/code-generator"
import type { GeneratedSchema } from "@/app/page"

interface ScriptsBuilderProps {
  schema: GeneratedSchema | null
  projectId?: string | null
}

export default function ScriptsBuilder({ schema, projectId }: ScriptsBuilderProps) {
  const [selectedTab, setSelectedTab] = useState<"sql" | "prisma" | "drizzle">("sql")
  const [selectedDialect, setSelectedDialect] = useState<"postgresql" | "mysql" | "sqlite">("postgresql")
  const [copied, setCopied] = useState(false)

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
    </div>
  )
}
