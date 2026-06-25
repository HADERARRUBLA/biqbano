"use client"

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, GripVertical } from "lucide-react"
import { WIDGET_CATALOG, WidgetDef } from "@/components/dashboard/widget-catalog"
import dynamic from "next/dynamic"

// Dynamic imports para evitar SSR issues con Recharts
const KPICards = dynamic(() => import("@/components/dashboard/kpi-cards"), { ssr: false })
const KpiSingle = dynamic(() => import("@/components/dashboard/widgets/kpi-single"), { ssr: false })
const ChartsGrid = dynamic(() => import("@/components/dashboard/charts-grid"), { ssr: false })
const OrdersTable = dynamic(() => import("@/components/dashboard/orders-table"), { ssr: false })
const AdvancedCalendar = dynamic(() => import("@/components/dashboard/widgets/advanced-calendar"), { ssr: false })
const AdvancedWeekday = dynamic(() => import("@/components/dashboard/widgets/advanced-weekday"), { ssr: false })
const AdvancedParticipation = dynamic(() => import("@/components/dashboard/widgets/advanced-participation"), { ssr: false })
const AdvancedHourly = dynamic(() => import("@/components/dashboard/widgets/advanced-hourly"), { ssr: false })

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
    return <KpiSingle type={type} />
  }

  // Charts — renders the full chart grid (shows only relevant chart)
  if (type.startsWith("chart_")) {
    return <ChartsGrid height={260} />
  }

  // Tabla
  if (type === "table_orders") {
    return <OrdersTable limit={20} />
  }

  // Advanced Analytics
  if (type === "advanced_calendar") return <AdvancedCalendar />
  if (type === "advanced_weekday") return <AdvancedWeekday />
  if (type === "advanced_participation") return <AdvancedParticipation />
  if (type === "advanced_hourly") return <AdvancedHourly />

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

function getWidgetColSpan(widget: WidgetItem): string {
  const size = widget.config?.size
  if (size === "1/3") return "col-span-1"
  if (size === "1/2") return "col-span-2"
  if (size === "full") return "col-span-3"

  // Fallback a defaultSize del catálogo
  const meta = getWidgetMeta(widget.type)
  const defSize = meta?.defaultSize || "1/3"
  if (defSize === "1/3") return "col-span-1"
  if (defSize === "1/2") return "col-span-2"
  return "col-span-3"
}

interface DraggableGridProps {
  widgets: WidgetItem[]
  editMode: boolean
  onReorder: (widgets: WidgetItem[]) => void
  onRemove: (id: string) => void
  onUpdateSize?: (id: string, size: '1/3' | '1/2' | 'full') => void
}

// ── Main Draggable Grid ───────────────────────────────────────────────────────
export default function DraggableGrid({ widgets, editMode, onReorder, onRemove, onUpdateSize }: DraggableGridProps) {
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

  // ── Vista normal (sin drag) — Renderizado en un solo grid de 3 columnas ─────
  if (!editMode) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {widgets.map((w) => {
          const meta = getWidgetMeta(w.type)
          const spanClass = getWidgetColSpan(w)
          const isKpi = w.type.startsWith("kpi_")
          
          return (
            <Card key={w.id} className={`overflow-hidden shadow-sm flex flex-col justify-between ${spanClass}`}>
              {!isKpi && (
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-500">{meta?.name}</CardTitle>
                  <div className={`p-1.5 rounded-lg ${meta?.bg}`}>
                    <span className={meta?.color}>{meta?.icon}</span>
                  </div>
                </CardHeader>
              )}
              <CardContent className={isKpi ? "p-0" : "p-4 pt-0"}>
                <WidgetRenderer type={w.type} />
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // ── Modo edición con drag & drop y controles de tamaño ───────────────────────
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
              const spanClass = getWidgetColSpan(widget)
              const currentSize = widget.config?.size || meta?.defaultSize || "1/3"

              return (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(draggableProvided, snapshot) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      style={draggableProvided.draggableProps.style as React.CSSProperties}
                      className={spanClass}
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

                          <CardTitle className="text-xs font-semibold text-gray-700 flex-1 truncate">
                            {meta?.name || widget.type}
                          </CardTitle>

                          {/* Size selectors */}
                          {onUpdateSize && (
                            <div className="flex items-center bg-gray-100 rounded-md p-0.5 mr-1">
                              {(["1/3", "1/2", "full"] as const).map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => onUpdateSize(widget.id, sz)}
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${
                                    currentSize === sz
                                      ? "bg-white text-blue-600 shadow-sm"
                                      : "text-gray-400 hover:text-gray-600"
                                  }`}
                                >
                                  {sz === "1/3" ? "1/3" : sz === "1/2" ? "1/2" : "Full"}
                                </button>
                              ))}
                            </div>
                          )}

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
                            widget.type === "table_orders" ? "h-28" : "h-20"
                          } ${meta?.bg}`}>
                            <div className="text-center">
                              <span className={`${meta?.color} [&>svg]:h-6 [&>svg]:w-6 flex justify-center mb-1`}>
                                {meta?.icon}
                              </span>
                              <p className="text-xs text-gray-500">{meta?.description}</p>
                              <Badge variant="outline" className="mt-1 text-[9px] capitalize">
                                Tamaño: {currentSize}
                              </Badge>
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
