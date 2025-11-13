"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database } from "lucide-react"
import type { GeneratedSchema } from "@/app/page"

interface ERDiagramProps {
  schema: GeneratedSchema | null
}

// Helper function to calculate connection points on table edges
function getConnectionPoints(
  from: { x: number; y: number; width: number; height: number },
  to: { x: number; y: number; width: number; height: number },
  padding: number
) {
  const fromCenterX = from.x + from.width / 2
  const fromCenterY = from.y + from.height / 2
  const toCenterX = to.x + to.width / 2
  const toCenterY = to.y + to.height / 2

  const dx = toCenterX - fromCenterX
  const dy = toCenterY - fromCenterY

  // Determine which edge to use based on relative positions
  let startX = fromCenterX
  let startY = fromCenterY
  let endX = toCenterX
  let endY = toCenterY

  // Calculate edge intersection points
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      // To is to the right
      startX = from.x + from.width + padding
      endX = to.x - padding
    } else {
      // To is to the left
      startX = from.x - padding
      endX = to.x + to.width + padding
    }
    startY = fromCenterY
    endY = toCenterY
  } else {
    // Vertical connection
    if (dy > 0) {
      // To is below
      startY = from.y + from.height + padding
      endY = to.y - padding
    } else {
      // To is above
      startY = from.y - padding
      endY = to.y + to.height + padding
    }
    startX = fromCenterX
    endX = toCenterX
  }

  return { startX, startY, endX, endY }
}

// Helper function to create smooth path
function createSmoothPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): string {
  const dx = endX - startX
  const dy = endY - startY
  const distance = Math.sqrt(dx * dx + dy * dy)
  const curvature = Math.min(distance * 0.3, 100)

  // Use quadratic bezier for smoother curves
  const controlX = startX + dx * 0.5
  const controlY = startY + dy * 0.5

  // Add perpendicular offset for curve
  const perpX = -dy / distance * curvature
  const perpY = dx / distance * curvature

  const cp1X = startX + dx * 0.3 + perpX
  const cp1Y = startY + dy * 0.3 + perpY
  const cp2X = startX + dx * 0.7 + perpX
  const cp2Y = startY + dy * 0.7 + perpY

  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
}

export default function ERDiagram({ schema }: ERDiagramProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  // Trigger animation when schema changes
  useEffect(() => {
    if (schema) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 500)
      return () => clearTimeout(timer)
    }
  }, [schema?.timestamp])

  const layout = useMemo(() => {
    if (!schema?.tables || schema.tables.length === 0) {
      return null
    }

    const CARD_WIDTH = 240
    const CARD_BASE_HEIGHT = 50
    const ROW_HEIGHT_PER_COLUMN = 18
    const HORIZONTAL_GAP = 100
    const VERTICAL_GAP = 80
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

    const positions: Record<string, { x: number; y: number; height: number; width: number }> = {}
    preliminary.forEach(({ id, row, col, estimatedHeight }) => {
      positions[id] = {
        x: col * (CARD_WIDTH + HORIZONTAL_GAP),
        y: rowOffsets[row],
        height: estimatedHeight,
        width: CARD_WIDTH,
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

  const CANVAS_PADDING = 80
  const EDGE_PADDING = 5
  const canvasWidth = Math.max(layout.diagramWidth + CANVAS_PADDING * 2, 1000)
  const canvasHeight = Math.max(layout.diagramHeight + CANVAS_PADDING * 2, 700)

  return (
    <div className="p-6">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Entity Relationship Diagram</CardTitle>
          <CardDescription>Visual representation of your database schema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-lg overflow-auto" style={{ height: "700px" }}>
            <div
              className="relative transition-all duration-500 ease-in-out"
              style={{
                minWidth: `${canvasWidth}px`,
                minHeight: `${canvasHeight}px`,
                opacity: isAnimating ? 0.7 : 1,
              }}
            >
              {/* Connection Lines */}
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                width={canvasWidth}
                height={canvasHeight}
                style={{ zIndex: 0 }}
              >
                <defs>
                  {/* Improved arrow marker */}
                  <marker
                    id="arrow-head"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path
                      d="M 0 0 L 6 3 L 0 6 z"
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.3"
                    />
                  </marker>
                  {/* Gradient for connections */}
                  <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
                  </linearGradient>
                  {/* Drop shadow filter */}
                  <filter id="connectionShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                    <feOffset dx="1" dy="1" result="offsetblur" />
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.3" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {connections.map((connection, idx) => {
                  const from = layout.positions[connection.from]
                  const to = layout.positions[connection.to]
                  if (!from || !to) return null

                  // Adjust positions with canvas padding
                  const fromAdjusted = {
                    x: from.x + CANVAS_PADDING,
                    y: from.y + CANVAS_PADDING,
                    width: from.width,
                    height: from.height,
                  }
                  const toAdjusted = {
                    x: to.x + CANVAS_PADDING,
                    y: to.y + CANVAS_PADDING,
                    width: to.width,
                    height: to.height,
                  }

                  const { startX, startY, endX, endY } = getConnectionPoints(
                    fromAdjusted,
                    toAdjusted,
                    EDGE_PADDING
                  )

                  const path = createSmoothPath(startX, startY, endX, endY)
                  const labelX = (startX + endX) / 2
                  const labelY = (startY + endY) / 2

                  return (
                    <g
                      key={`${connection.from}-${connection.to}-${idx}`}
                      className="transition-opacity duration-500"
                      style={{ opacity: isAnimating ? 0.5 : 1 }}
                    >
                      {/* Connection line */}
                      <path
                        d={path}
                        stroke="url(#connectionGradient)"
                        strokeWidth="2.5"
                        fill="none"
                        markerEnd="url(#arrow-head)"
                        filter="url(#connectionShadow)"
                        className="transition-all duration-500"
                        style={{
                          strokeDasharray: "6 4",
                        }}
                      />
                      {/* Label text */}
                      <text
                        x={labelX}
                        y={labelY + 2}
                        textAnchor="middle"
                        className="fill-primary text-[10px] font-semibold"
                        style={{
                          pointerEvents: "none",
                          textShadow: "0 1px 2px rgba(0, 0, 0, 0.3), 0 0 4px rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {connection.label}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* Table Cards */}
              <div className="relative" style={{ zIndex: 1 }}>
                {schema.tables.map((table) => {
                  const pos = layout.positions[table.id]
                  return (
                    <div
                      key={table.id}
                      className="absolute bg-background border-2 border-primary/20 rounded-lg shadow-lg overflow-hidden transition-all duration-500 hover:shadow-xl hover:border-primary/40 hover:scale-[1.02]"
                      style={{
                        left: `${(pos?.x || 0) + CANVAS_PADDING}px`,
                        top: `${(pos?.y || 0) + CANVAS_PADDING}px`,
                        width: `${layout.cardWidth}px`,
                        minHeight: `${pos?.height || 0}px`,
                        opacity: isAnimating ? 0.7 : 1,
                        transform: isAnimating ? "scale(0.95)" : "scale(1)",
                      }}
                    >
                      {/* Table Header */}
                      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-2 py-1 flex items-center gap-1.5">
                        <Database className="w-3 h-3" />
                        <h3 className="font-semibold text-xs">{table.name}</h3>
                      </div>

                      {/* Columns */}
                      <div className="divide-y divide-border">
                        {table.columns.length === 0 ? (
                          <div className="p-2 text-[10px] text-muted-foreground text-center">No columns</div>
                        ) : (
                          table.columns.map((column) => (
                            <div
                              key={column.id}
                              className="px-2 py-1 text-[9px] hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-1.5 flex-nowrap">
                                {column.isPrimaryKey && (
                                  <span className="font-bold text-primary text-[8px] flex-shrink-0" title="Primary Key">
                                    🔑
                                  </span>
                                )}
                                {column.isForeignKey && (
                                  <span
                                    className="font-bold text-accent text-[8px] flex-shrink-0"
                                    title={`Foreign key to ${column.foreignKeyTable}`}
                                  >
                                    🔗
                                  </span>
                                )}
                                <span className="font-mono font-semibold text-foreground truncate min-w-0">
                                  {column.name}
                                </span>
                                <span className="text-muted-foreground truncate min-w-0">
                                  {column.type}
                                </span>
                                {column.nullable && (
                                  <span className="text-muted-foreground opacity-60 flex-shrink-0">(null)</span>
                                )}
                                {column.isForeignKey && column.foreignKeyTable && (
                                  <span className="text-accent truncate min-w-0">
                                    → {column.foreignKeyTable}
                                  </span>
                                )}
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
              Showing {schema.tables.length} table(s) with{" "}
              {schema.tables.reduce((sum, t) => sum + t.columns.length, 0)} total columns
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
