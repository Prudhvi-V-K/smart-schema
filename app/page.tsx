"use client"

import { useState } from "react"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import AIGeneratorForm from "@/components/ai-generator-form"
import ERDiagram from "@/components/er-diagram"
import ScriptsBuilder from "@/components/scripts-builder"
import ExportPanel from "@/components/export-panel"

export interface Column {
  id: string
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
  isForeignKey?: boolean
  foreignKeyTable?: string
}

export interface Table {
  id: string
  name: string
  columns: Column[]
}

export interface GeneratedSchema {
  tables: Table[]
  description: string
  explanation?: string
  timestamp: string
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"generator" | "diagram" | "scripts" | "export">("generator")
  const [schema, setSchema] = useState<GeneratedSchema | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto">
          {activeTab === "generator" && (
            <AIGeneratorForm onSchemaGenerated={setSchema} isLoading={isLoading} setIsLoading={setIsLoading} />
          )}
          {activeTab === "diagram" && <ERDiagram schema={schema} />}
          {activeTab === "scripts" && <ScriptsBuilder schema={schema} />}
          {activeTab === "export" && schema && (
            <ExportPanel schema={schema} onSchemaChange={setSchema} />
          )}
          {activeTab === "export" && !schema && <ExportPanel schema={schema} />}
        </div>
      </main>
    </div>
  )
}
