"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DollarSign, Package, TrendingUp, User, Store, Clock, Award } from "lucide-react"
import { formatCOP, formatNumber } from "@/lib/format"

interface KPIData {
  totalVentas: number
  totalPedidos: number
  ticketPromedio: number
  topAgente: string
  topPDV: string
  pedidosAntesDe12: number
  porcentajeAntesDe12: number
}

interface KpiSingleProps {
  type: string
}

export default function KpiSingle({ type }: KpiSingleProps) {
  const searchParams = useSearchParams()
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true)
        const params = searchParams.toString()
        const res = await fetch(`/api/dashboard/kpis?${params}`)
        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch (error) {
        console.error("Error cargando KPI:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchKPIs()
  }, [searchParams])

  if (loading) {
    return (
      <div className="animate-pulse flex items-center space-x-4 py-2">
        <div className="rounded-full bg-gray-200 h-10 w-10"></div>
        <div className="flex-1 space-y-2 py-1">
          <div className="h-2 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-sm text-gray-500 py-2">Sin datos</div>
  }

  // Map type to metric details
  let value = ""
  let Icon = DollarSign
  let color = "text-green-600"
  let bg = "bg-green-50"
  let label = ""

  switch (type) {
    case "kpi_total_ventas":
      value = formatCOP(data.totalVentas)
      Icon = DollarSign
      color = "text-green-600"
      bg = "bg-green-50"
      label = "Total Ventas"
      break
    case "kpi_total_pedidos":
      value = formatNumber(data.totalPedidos)
      Icon = Package
      color = "text-blue-600"
      bg = "bg-blue-50"
      label = "Total Pedidos"
      break
    case "kpi_ticket_promedio":
      value = formatCOP(data.ticketPromedio)
      Icon = TrendingUp
      color = "text-orange-600"
      bg = "bg-orange-50"
      label = "Ticket Promedio"
      break
    case "kpi_top_agente":
      value = data.topAgente || "N/A"
      Icon = User
      color = "text-purple-600"
      bg = "bg-purple-50"
      label = "Top Agente"
      break
    case "kpi_top_pdv":
      value = data.topPDV || "N/A"
      Icon = Store
      color = "text-pink-600"
      bg = "bg-pink-50"
      label = "Top PDV"
      break
    case "kpi_antes_12":
      value = formatNumber(data.pedidosAntesDe12)
      Icon = Clock
      color = "text-indigo-600"
      bg = "bg-indigo-50"
      label = "Pedidos antes de las 12"
      break
    case "kpi_cumplimiento":
      value = `${data.porcentajeAntesDe12}%`
      Icon = Award
      color = "text-yellow-600"
      bg = "bg-yellow-50"
      label = "% Cumplimiento"
      break
    default:
      return <div className="text-xs text-red-500">Tipo de KPI desconocido: {type}</div>
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <div className={`p-3 rounded-full ${bg} mb-2`}>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-extrabold text-gray-900 tracking-tight" title={value}>
          {value}
        </p>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}
