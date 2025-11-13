"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Trash2, Database, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from "date-fns"

export interface Project {
  _id: string
  userId: string
  projectName: string
  description: string
  schema: any
  explanation: string | null
  codeFormats: any
  createdAt: string
  updatedAt: string
}

interface SidebarProps {
  selectedProjectId: string | null
  onProjectSelect: (projectId: string | null) => void
  onNewProject: () => void
  refreshTrigger?: number
}

export default function Sidebar({ selectedProjectId, onProjectSelect, onNewProject, refreshTrigger }: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [refreshTrigger])

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this project?")) {
      return
    }

    try {
      setDeletingId(projectId)
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setProjects(projects.filter((p) => p._id !== projectId))
        if (selectedProjectId === projectId) {
          onProjectSelect(null)
        }
      }
    } catch (error) {
      console.error("Failed to delete project:", error)
      alert("Failed to delete project")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredProjects = projects.filter((project) =>
    project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <Button onClick={onNewProject} className="w-full gap-2" size="sm">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      <div className="p-4 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {searchQuery ? "No projects found" : "No projects yet. Create one to get started!"}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredProjects.map((project) => {
              const isSelected = selectedProjectId === project._id
              const updatedDate = new Date(project.updatedAt)
              const timeAgo = formatDistanceToNow(updatedDate, { addSuffix: true })

              return (
                <div
                  key={project._id}
                  onClick={() => onProjectSelect(project._id)}
                  className={`
                    group relative p-3 rounded-lg cursor-pointer transition-colors
                    ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent"}
                  `}
                >
                  <div className="flex items-start gap-2">
                    <Database className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{project.projectName}</div>
                      <div className={`text-xs mt-1 truncate ${isSelected ? "opacity-80" : "text-muted-foreground"}`}>
                        {timeAgo}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={`opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? "hover:bg-primary-foreground/20" : ""}`}
                      onClick={(e) => handleDelete(project._id, e)}
                      disabled={deletingId === project._id}
                    >
                      {deletingId === project._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </p>
      </div>
    </aside>
  )
}
