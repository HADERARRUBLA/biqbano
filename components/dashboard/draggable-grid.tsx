"use client"

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, GripVertical } from "lucide-react"
import { WIDGET_CATALOG, WidgetDef } from "@/components/dashboard/widget-catalog"
import dynamic from "next/dynamic"

// Dynamic imports para evitar SSR issues con Recharts
const KPICards = dynamic(() => import("@/components/dashboard/kpi-cards"), { ssr: false })
const ChartsGrid = dynamic(() => import("@/components/dashboard/charts-grid"), { ssr: false })
const OrdersTable = dynamic(() => import("@/components/dashboard/orders-table"), { ssr: false })

export interface WidgetItem {
  id: string
  type: string
  position: number
  config?: any
}

interface DraggableGridProps {
  widgets: WidgetItem[]
  editMode: boolean
  onReorder: (widgets: WidgetItem[]) => void
  onRemove: (id: string) => void
}

// ── Render individual widget ──────────────────────────────────────────────────
function WidgetRenderer({ type }: { type: string }) {
  // KPIs — renders the single stat card value inline
  if (type.startsWith("kpi_")) {
    return <KPICards />
  }

  // Charts — renders the full chart grid (shows only relevant chart)
  if (type.startsWith("chart_")) {
    return <ChartsGrid height={260} />
  }

  // Tabla
  if (type === "table_orders") {
    return <OrdersTable limit={20} />
  }

  return (
    <div className="flex items-center justify-center h-32 text-sm text-gray-400">
      Widget desconocido: {type}
    </div>
  )
}

// ── Widget meta helper ────────────────────────────────────────────────────────
function getWidgetMeta(type: string): WidgetDef | undefined {
  return WIDGET_CATALOG.find((w) => w.type === type)
}

function getWidgetColSpan(type: string): string {
  if (type.startsWith("kpi_")) return "col-span-1"
  if (type === "table_orders") return "col-span-full"
  return "col-span-1 md:col-span-1"
}

// ── Main Draggable Grid ───────────────────────────────────────────────────────
export default function DraggableGrid({ widgets, editMode, onReorder, onRemove }: DraggableGridProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    if (result.destination.index === result.source.index) return

    const reordered = Array.from(widgets)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)

    // Recalcular posiciones
    const updated = reordered.map((w, idx) => ({ ...w, position: idx }))
    onReorder(updated)
  }

  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">🧩</div>
        <p className="text-gray-600 font-medium">Dashboard vacío</p>
        <p className="text-sm text-gray-400 mt-1">
          {editMode ? "Añade widgets desde el catálogo →" : "Activa el modo edición para agregar widgets"}
        </p>
      </div>
    )
  }

  // ── Vista normal (sin drag) ───────────────────────────────────────────────
  if (!editMode) {
    const kpis = widgets.filter((w) => w.type.startsWith("kpi_"))
    const charts = widgets.filter((w) => w.type.startsWith("chart_"))
    const tables = widgets.filter((w) => w.type === "table_orders")

    return (
      <div className="space-y-6">
        {kpis.length > 0 && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {kpis.map((w) => {
              const meta = getWidgetMeta(w.type)
              return (
                <Card key={w.id} className="overflow-hidden shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                    <CardTitle className="text-xs font-medium text-gray-500">{meta?.name}</CardTitle>
                    <div className={`p-1.5 rounded-lg ${meta?.bg}`}>
                      <span className={meta?.color}>{meta?.icon}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <WidgetRenderer type={w.type} />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        {charts.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {charts.map((w) => (
              <WidgetRenderer key={w.id} type={w.type} />
            ))}
          </div>
        )}
        {tables.map((w) => (
          <WidgetRenderer key={w.id} type={w.type} />
        ))}
      </div>
    )
  }

  // ── Modo edición con drag & drop ─────────────────────────────────────────
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard-grid">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          >
            {widgets.map((widget, index) => {
              const meta = getWidgetMeta(widget.type)
              return (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(draggableProvided, snapshot) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      style={draggableProvided.draggableProps.style as React.CSSProperties}
                      className={`${widget.type === "table_orders" ? "col-span-full" : ""}`}
                    >
                      <Card
                        className={`overflow-hidden shadow-sm border-2 transition-all ${
                          snapshot.isDragging
                            ? "border-blue-400 shadow-lg rotate-1 scale-105"
                            : "border-blue-200"
                        }`}
                      >
                        <CardHeader className="flex flex-row items-center gap-2 p-3 bg-blue-50/50">
                          {/* Drag handle */}
                          <div
                            {...draggableProvided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
                          >
                            <GripVertical className="h-4 w-4" />
                          </div>

                          <div className={`p-1 rounded-md ${meta?.bg} flex-shrink-0`}>
                            <span className={`${meta?.color} [&>svg]:h-3.5 [&>svg]:w-3.5`}>{meta?.icon}</span>
                          </div>

                          <CardTitle className="text-xs font-medium text-gray-700 flex-1 truncate">
                            {meta?.name || widget.type}
                          </CardTitle>

                          {/* Remove button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 flex-shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => onRemove(widget.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </CardHeader>

                        <CardContent className="p-3 text-xs text-gray-500 bg-white">
                          <div className={`rounded-md border border-dashed border-gray-200 flex items-center justify-center ${
                            widget.type === "table_orders" ? "h-24" : "h-20"
                          } ${meta?.bg}`}>
                            <div className="text-center">
                              <span className={`${meta?.color} [&>svg]:h-6 [&>svg]:w-6 flex justify-center mb-1`}>
                                {meta?.icon}
                              </span>
                              <p className="text-xs text-gray-500">{meta?.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </Draggable>
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
