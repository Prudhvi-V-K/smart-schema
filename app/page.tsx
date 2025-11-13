"use client"

import { useState, useEffect } from "react"
import Header from "@/components/header"
import Sidebar, { type Project } from "@/components/sidebar"
import AIGeneratorForm from "@/components/ai-generator-form"
import ERDiagram from "@/components/er-diagram"
import ScriptsBuilder from "@/components/scripts-builder"
import ExportPanel from "@/components/export-panel"
import { Button } from "@/components/ui/button"
import { Database, GitBranch, Settings, Brain } from "lucide-react"

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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0)

  // Load project when selected
  useEffect(() => {
    if (selectedProjectId) {
      setIsLoadingProject(true)
      fetch(`/api/projects/${selectedProjectId}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedProject(data)
          if (data.schema) {
            setSchema(data.schema)
          }
        })
        .catch((error) => {
          console.error("Failed to load project:", error)
        })
        .finally(() => {
          setIsLoadingProject(false)
        })
    } else {
      setSelectedProject(null)
      setSchema(null)
    }
  }, [selectedProjectId])

  const handleNewProject = () => {
    setSelectedProjectId(null)
    setSelectedProject(null)
    setSchema(null)
    setActiveTab("generator")
  }

  const handleSchemaGenerated = (newSchema: GeneratedSchema & { projectId?: string }) => {
    setSchema(newSchema)
    // Refresh sidebar to show new/updated projects
    setSidebarRefreshTrigger((prev) => prev + 1)
    // If a new project was created, select it
    if (newSchema.projectId && !selectedProjectId) {
      setSelectedProjectId(newSchema.projectId)
    } else if (selectedProjectId) {
      // Reload the current project if one is selected
      fetch(`/api/projects/${selectedProjectId}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedProject(data)
        })
        .catch(console.error)
    }
  }

  const tabs = [
    { id: "generator", label: "Generator", icon: Database },
    { id: "diagram", label: "ER Diagram", icon: GitBranch },
    { id: "scripts", label: "Scripts", icon: Settings },
    { id: "export", label: "Explanation", icon: Brain },
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        selectedProjectId={selectedProjectId}
        onProjectSelect={setSelectedProjectId}
        onNewProject={handleNewProject}
        refreshTrigger={sidebarRefreshTrigger}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        {selectedProject && (
          <div className="border-b border-border px-6 py-2 bg-muted/30">
            <h2 className="text-sm font-semibold">{selectedProject.projectName}</h2>
          </div>
        )}
        <div className="border-b border-border px-6">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="gap-2"
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {isLoadingProject ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading project...</p>
            </div>
          ) : (
            <>
              {activeTab === "generator" && (
                <AIGeneratorForm
                  onSchemaGenerated={handleSchemaGenerated}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  projectId={selectedProjectId}
                />
              )}
              {activeTab === "diagram" && <ERDiagram schema={schema} />}
              {activeTab === "scripts" && <ScriptsBuilder schema={schema} projectId={selectedProjectId} />}
              {activeTab === "export" && schema && (
                <ExportPanel schema={schema} onSchemaChange={setSchema} />
              )}
              {activeTab === "export" && !schema && <ExportPanel schema={schema} />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
