"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Wand2 } from "lucide-react"

interface Column {
  id: string
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
}

interface Table {
  id: string
  name: string
  columns: Column[]
}

interface SchemaFormProps {
  onSchemaChange: (schema: Table[]) => void
}

export default function SchemaForm({ onSchemaChange }: SchemaFormProps) {
  const [tables, setTables] = useState<Table[]>([])
  const [newTableName, setNewTableName] = useState("")
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [columnForm, setColumnForm] = useState({
    name: "",
    type: "string",
    nullable: false,
    isPrimaryKey: false,
  })

  const addTable = () => {
    if (!newTableName.trim()) return
    const newTable: Table = {
      id: Date.now().toString(),
      name: newTableName,
      columns: [],
    }
    const updated = [...tables, newTable]
    setTables(updated)
    onSchemaChange(updated)
    setNewTableName("")
  }

  const addColumn = (tableId: string) => {
    if (!columnForm.name.trim()) return
    const updated = tables.map((table) => {
      if (table.id === tableId) {
        return {
          ...table,
          columns: [
            ...table.columns,
            {
              id: Date.now().toString(),
              name: columnForm.name,
              type: columnForm.type,
              nullable: columnForm.nullable,
              isPrimaryKey: columnForm.isPrimaryKey,
            },
          ],
        }
      }
      return table
    })
    setTables(updated)
    onSchemaChange(updated)
    setColumnForm({ name: "", type: "string", nullable: false, isPrimaryKey: false })
  }

  const deleteColumn = (tableId: string, columnId: string) => {
    const updated = tables.map((table) => {
      if (table.id === tableId) {
        return {
          ...table,
          columns: table.columns.filter((col) => col.id !== columnId),
        }
      }
      return table
    })
    setTables(updated)
    onSchemaChange(updated)
  }

  const deleteTable = (tableId: string) => {
    const updated = tables.filter((table) => table.id !== tableId)
    setTables(updated)
    onSchemaChange(updated)
  }

  const generateWithAI = async () => {
    // Placeholder for AI generation - will be enhanced later
    console.log("Generate with AI triggered")
  }

  return (
    <div className="p-6 space-y-6">
      {/* Create Table Section */}
      <Card>
        <CardHeader>
          <CardTitle>Create Database Schema</CardTitle>
          <CardDescription>Define your tables and columns to generate database scripts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Table Name</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., users, products, orders"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") addTable()
                }}
              />
              <Button onClick={addTable} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Table
              </Button>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <Button variant="outline" className="w-full gap-2 bg-transparent" onClick={generateWithAI}>
              <Wand2 className="w-4 h-4" />
              Generate Schema with AI
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tables List */}
      <div className="space-y-4">
        {tables.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-muted-foreground">No tables yet. Create your first table above.</p>
            </CardContent>
          </Card>
        ) : (
          tables.map((table) => (
            <Card key={table.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{table.name}</CardTitle>
                    <CardDescription>{table.columns.length} column(s)</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTable(table.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Columns List */}
                {table.columns.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {table.columns.map((column) => (
                      <div key={column.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-foreground">{column.name}</span>
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">{column.type}</span>
                            {column.isPrimaryKey && (
                              <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">PK</span>
                            )}
                            {column.nullable && <span className="text-xs text-muted-foreground">nullable</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteColumn(table.id, column.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Column Form */}
                {editingTableId === table.id ? (
                  <div className="space-y-3 p-4 bg-muted rounded-lg border border-border">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Column Name</label>
                      <Input
                        placeholder="e.g., email, username, created_at"
                        value={columnForm.name}
                        onChange={(e) => setColumnForm({ ...columnForm, name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <select
                          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                          value={columnForm.type}
                          onChange={(e) => setColumnForm({ ...columnForm, type: e.target.value })}
                        >
                          <option>string</option>
                          <option>integer</option>
                          <option>boolean</option>
                          <option>timestamp</option>
                          <option>decimal</option>
                          <option>json</option>
                          <option>text</option>
                          <option>uuid</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Options</label>
                        <div className="flex gap-2 items-center h-10">
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={columnForm.isPrimaryKey}
                              onChange={(e) =>
                                setColumnForm({
                                  ...columnForm,
                                  isPrimaryKey: e.target.checked,
                                })
                              }
                              className="w-4 h-4"
                            />
                            PK
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={columnForm.nullable}
                              onChange={(e) =>
                                setColumnForm({
                                  ...columnForm,
                                  nullable: e.target.checked,
                                })
                              }
                              className="w-4 h-4"
                            />
                            Nullable
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => addColumn(table.id)} className="flex-1 gap-2">
                        <Plus className="w-4 h-4" />
                        Add Column
                      </Button>
                      <Button variant="outline" onClick={() => setEditingTableId(null)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full gap-2 bg-transparent"
                    onClick={() => setEditingTableId(table.id)}
                  >
                    <Plus className="w-4 h-4" />
                    Add Column
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
