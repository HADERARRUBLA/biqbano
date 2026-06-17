"use client"

import { DollarSign, Package, TrendingUp, User, Store, Award, LineChart, BarChart3, PieChart, Clock, Table } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface WidgetDef {
  type: string
  name: string
  category: "kpi" | "chart" | "table"
  icon: React.ReactNode
  color: string
  bg: string
  description: string
}

export const WIDGET_CATALOG: WidgetDef[] = [
  // ── KPIs ──────────────────────────────────────────────────────────────────
  {
    type: "kpi_total_ventas",
    name: "Total Ventas",
    category: "kpi",
    icon: <DollarSign className="h-5 w-5" />,
    color: "text-green-600",
    bg: "bg-green-50",
    description: "Suma total de ventas en el período",
  },
  {
    type: "kpi_total_pedidos",
    name: "Total Pedidos",
    category: "kpi",
    icon: <Package className="h-5 w-5" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    description: "Cantidad de pedidos sincronizados",
  },
  {
    type: "kpi_ticket_promedio",
    name: "Ticket Promedio",
    category: "kpi",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-orange-600",
    bg: "bg-orange-50",
    description: "Valor promedio por pedido",
  },
  {
    type: "kpi_top_agente",
    name: "Top Agente",
    category: "kpi",
    icon: <User className="h-5 w-5" />,
    color: "text-purple-600",
    bg: "bg-purple-50",
    description: "Agente con mayor volumen de ventas",
  },
  {
    type: "kpi_top_pdv",
    name: "Top PDV",
    category: "kpi",
    icon: <Store className="h-5 w-5" />,
    color: "text-pink-600",
    bg: "bg-pink-50",
    description: "Punto de venta con mayores ingresos",
  },
  {
    type: "kpi_cumplimiento",
    name: "% Cumplimiento",
    category: "kpi",
    icon: <Award className="h-5 w-5" />,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    description: "% de pedidos realizados antes de las 12",
  },
  // ── Charts ────────────────────────────────────────────────────────────────
  {
    type: "chart_ventas_dia",
    name: "Ventas por Día",
    category: "chart",
    icon: <LineChart className="h-5 w-5" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    description: "Tendencia de ventas diaria",
  },
  {
    type: "chart_por_agente",
    name: "Ventas por Agente",
    category: "chart",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "text-orange-600",
    bg: "bg-orange-50",
    description: "Top 10 agentes por ventas",
  },
  {
    type: "chart_por_tipo",
    name: "Por Tipo Solicitud",
    category: "chart",
    icon: <PieChart className="h-5 w-5" />,
    color: "text-purple-600",
    bg: "bg-purple-50",
    description: "Distribución por tipo de solicitud",
  },
  {
    type: "chart_por_turno",
    name: "Pedidos por Turno",
    category: "chart",
    icon: <Clock className="h-5 w-5" />,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    description: "Distribución por turno del día",
  },
  {
    type: "chart_top_pdv",
    name: "Top PDV (Gráfica)",
    category: "chart",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "text-pink-600",
    bg: "bg-pink-50",
    description: "Top 10 puntos de venta",
  },
  // ── Table ─────────────────────────────────────────────────────────────────
  {
    type: "table_orders",
    name: "Tabla de Pedidos",
    category: "table",
    icon: <Table className="h-5 w-5" />,
    color: "text-gray-600",
    bg: "bg-gray-100",
    description: "Listado detallado de pedidos",
  },
]

const CATEGORY_LABEL: Record<string, string> = {
  kpi: "📊 KPIs",
  chart: "📈 Gráficas",
  table: "📋 Tabla",
}

interface WidgetCatalogProps {
  activeTypes: string[]
  onAdd: (type: string) => void
}

export default function WidgetCatalog({ activeTypes, onAdd }: WidgetCatalogProps) {
  const categories = ["kpi", "chart", "table"] as const

  return (
    <div className="w-72 border-l bg-gray-50 flex flex-col h-full">
      <div className="p-4 border-b bg-white">
        <h3 className="font-semibold text-sm text-gray-800">Catálogo de Widgets</h3>
        <p className="text-xs text-gray-500 mt-0.5">Haz clic para añadir al dashboard</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {CATEGORY_LABEL[cat]}
              </p>
              <div className="space-y-1.5">
                {WIDGET_CATALOG.filter((w) => w.category === cat).map((widget) => {
                  const isActive = activeTypes.includes(widget.type)
                  return (
                    <div
                      key={widget.type}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                        isActive
                          ? "bg-blue-50 border-blue-200 opacity-60"
                          : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer"
                      }`}
                      onClick={() => !isActive && onAdd(widget.type)}
                    >
                      <div className={`p-1.5 rounded-md ${widget.bg} flex-shrink-0`}>
                        <span className={widget.color}>{widget.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{widget.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{widget.description}</p>
                      </div>
                      {isActive ? (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">✓</Badge>
                      ) : (
                        <span className="text-blue-500 text-lg flex-shrink-0">+</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
