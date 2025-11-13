"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database } from "lucide-react"
import type { GeneratedSchema } from "@/app/page"

interface ERDiagramProps {
  schema: GeneratedSchema | null
}

export default function ERDiagram({ schema }: ERDiagramProps) {
  const layout = useMemo(() => {
    if (!schema?.tables || schema.tables.length === 0) {
      return null
    }

    const CARD_WIDTH = 320
    const CARD_BASE_HEIGHT = 120
    const ROW_HEIGHT_PER_COLUMN = 40
    const HORIZONTAL_GAP = 120
    const VERTICAL_GAP = 120
    const tablesPerRow = Math.max(1, Math.ceil(Math.sqrt(schema.tables.length)))

    const preliminary: Array<{
      id: string
      row: number
      col: number
      estimatedHeight: number
    }> = []
    const rowHeights: number[] = []
    const rowCounts: number[] = []

    schema.tables.forEach((table, index) => {
      const row = Math.floor(index / tablesPerRow)
      const col = index % tablesPerRow
      const estimatedHeight = CARD_BASE_HEIGHT + table.columns.length * ROW_HEIGHT_PER_COLUMN

      rowHeights[row] = Math.max(rowHeights[row] ?? 0, estimatedHeight)
      rowCounts[row] = (rowCounts[row] ?? 0) + 1

      preliminary.push({
        id: table.id,
        row,
        col,
        estimatedHeight,
      })
    })

    const rowOffsets: number[] = []
    let runningY = 0
    rowHeights.forEach((height, idx) => {
      rowOffsets[idx] = runningY
      runningY += height + VERTICAL_GAP
    })

    const positions: Record<string, { x: number; y: number; height: number }> = {}
    preliminary.forEach(({ id, row, col, estimatedHeight }) => {
      positions[id] = {
        x: col * (CARD_WIDTH + HORIZONTAL_GAP),
        y: rowOffsets[row],
        height: estimatedHeight,
      }
    })

    const maxColumns = Math.max(...rowCounts, 1)
    const diagramWidth =
      maxColumns * CARD_WIDTH + (maxColumns - 1) * HORIZONTAL_GAP
    const totalRowHeights = rowHeights.reduce((sum, height) => sum + height, 0)
    const diagramHeight =
      totalRowHeights + Math.max(0, rowHeights.length - 1) * VERTICAL_GAP

    return {
      cardWidth: CARD_WIDTH,
      positions,
      diagramWidth,
      diagramHeight,
    }
  }, [schema])

  const connections = useMemo(() => {
    if (!schema?.tables || !layout) return []

    const tableByName = new Map(
      schema.tables.map((table) => [table.name.toLowerCase(), table.id]),
    )

    const links: Array<{
      from: string
      to: string
      label: string
    }> = []

    schema.tables.forEach((table) => {
      table.columns.forEach((column) => {
        if (column.isForeignKey && column.foreignKeyTable) {
          const targetId = tableByName.get(column.foreignKeyTable.toLowerCase())
          if (!targetId || !layout.positions[table.id] || !layout.positions[targetId]) return

          links.push({
            from: table.id,
            to: targetId,
            label: column.name,
          })
        }
      })
    })

    return links
  }, [schema, layout])

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

  if (!layout) return null

  const CANVAS_PADDING = 60
  const canvasWidth = Math.max(layout.diagramWidth + CANVAS_PADDING * 2, 900)
  const canvasHeight = Math.max(layout.diagramHeight + CANVAS_PADDING * 2, 600)

  return (
    <div className="p-6">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Entity Relationship Diagram</CardTitle>
          <CardDescription>Visual representation of your database schema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-lg overflow-auto" style={{ height: "600px" }}>
            <div
              className="relative"
              style={{
                minWidth: `${canvasWidth}px`,
                minHeight: `${canvasHeight}px`,
              }}
            >
              {/* Table Cards */}
              <svg
                className="absolute top-0 left-0"
                width={canvasWidth}
                height={canvasHeight}
                style={{ zIndex: 0 }}
              >
                <defs>
                  <marker
                    id="arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="4"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L8,4 L0,8 z" fill="hsl(var(--accent))" />
                  </marker>
                </defs>
                {connections.map((connection, idx) => {
                  const from = layout.positions[connection.from]
                  const to = layout.positions[connection.to]
                  if (!from || !to) return null

                  const startX = from.x + layout.cardWidth / 2 + CANVAS_PADDING
                  const startY = from.y + from.height / 2 + CANVAS_PADDING
                  const endX = to.x + layout.cardWidth / 2 + CANVAS_PADDING
                  const endY = to.y + to.height / 2 + CANVAS_PADDING
                  const delta = Math.max(Math.abs(endX - startX), 80) * 0.5

                  const path = `M ${startX} ${startY} C ${startX + delta} ${startY}, ${endX - delta} ${endY}, ${endX} ${endY}`

                  return (
                    <g key={`${connection.from}-${connection.to}-${idx}`} className="stroke-accent">
                      <path
                        d={path}
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        fill="none"
                        markerEnd="url(#arrow)"
                        strokeDasharray="6 4"
                      />
                      <text
                        x={(startX + endX) / 2}
                        y={(startY + endY) / 2 - 6}
                        textAnchor="middle"
                        className="fill-accent text-[10px]"
                      >
                        {connection.label}
                      </text>
                    </g>
                  )
                })}
              </svg>

              <div className="relative" style={{ zIndex: 1 }}>
                {schema.tables.map((table) => {
                  const pos = layout.positions[table.id]
                  return (
                    <div
                      key={table.id}
                      className="absolute bg-background border-2 border-border rounded-lg shadow-md overflow-hidden"
                      style={{
                        left: `${(pos?.x || 0) + CANVAS_PADDING}px`,
                        top: `${(pos?.y || 0) + CANVAS_PADDING}px`,
                        width: `${layout.cardWidth}px`,
                        minHeight: `${pos?.height || 0}px`,
                      }}
                    >
                      {/* Table Header */}
                      <div className="bg-primary text-primary-foreground p-3 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        <h3 className="font-semibold text-sm">{table.name}</h3>
                      </div>

                      {/* Columns */}
                      <div className="divide-y divide-border">
                        {table.columns.length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground text-center">No columns</div>
                        ) : (
                          table.columns.map((column) => (
                            <div key={column.id} className="p-2 text-xs hover:bg-muted transition-colors">
                              <div className="flex items-center gap-2 justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {column.isPrimaryKey && (
                                      <span className="font-bold text-primary" title="Primary Key">
                                        🔑
                                      </span>
                                    )}
                                    {column.isForeignKey && (
                                      <span
                                        className="font-bold text-accent"
                                        title={`Foreign key to ${column.foreignKeyTable}`}
                                      >
                                        🔗
                                      </span>
                                    )}
                                    <span className="font-mono font-semibold text-foreground">{column.name}</span>
                                  </div>
                                  <div className="text-muted-foreground mt-1">
                                    {column.type}
                                    {column.nullable && <span className="ml-1 opacity-60">(null)</span>}
                                    {column.isForeignKey && column.foreignKeyTable && (
                                      <div className="text-accent mt-1">→ {column.foreignKeyTable}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
            <p>
              Showing {schema.tables.length} table(s) with {schema.tables.reduce((sum, t) => sum + t.columns.length, 0)}{" "}
              total columns
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
