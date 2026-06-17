"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCOP, formatNumber } from "@/lib/format"
import { DollarSign, Package, TrendingUp, User, Store, Clock, Award } from "lucide-react"

interface KPIData {
  totalVentas: number
  totalPedidos: number
  ticketPromedio: number
  topAgente: string
  topPDV: string
  pedidosAntesDe12: number
  porcentajeAntesDe12: number
}

export default function KPICards() {
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
        console.error("Error cargando KPIs:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchKPIs()
  }, [searchParams])

  const skeleton = (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
    </div>
  )

  const cards = [
    {
      title: "Total Ventas",
      value: data ? formatCOP(data.totalVentas) : "",
      icon: DollarSign,
      color: "text-green-500",
      bg: "bg-green-50"
    },
    {
      title: "Total Pedidos",
      value: data ? formatNumber(data.totalPedidos) : "",
      icon: Package,
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "Ticket Promedio",
      value: data ? formatCOP(data.ticketPromedio) : "",
      icon: TrendingUp,
      color: "text-orange-500",
      bg: "bg-orange-50"
    },
    {
      title: "Top Agente",
      value: data?.topAgente || "N/A",
      icon: User,
      color: "text-purple-500",
      bg: "bg-purple-50"
    },
    {
      title: "Top PDV",
      value: data?.topPDV || "N/A",
      icon: Store,
      color: "text-pink-500",
      bg: "bg-pink-50"
    },
    {
      title: "Pedidos Antes de las 12",
      value: data ? formatNumber(data.pedidosAntesDe12) : "",
      icon: Clock,
      color: "text-indigo-500",
      bg: "bg-indigo-50"
    },
    {
      title: "% Cumplimiento",
      value: data ? `${data.porcentajeAntesDe12}%` : "",
      icon: Award,
      color: "text-yellow-600",
      bg: "bg-yellow-50"
    }
  ]

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-7 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <Card key={idx} className="overflow-hidden shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-xs font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <div className={`p-1.5 rounded-lg ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {loading ? (
                skeleton
              ) : (
                <div className="text-lg font-bold text-gray-950 truncate" title={card.value}>
                  {card.value}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
