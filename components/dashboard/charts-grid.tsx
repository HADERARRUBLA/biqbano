"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCOP } from "@/lib/format"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

interface ChartData {
  ventasPorDia: Array<{ fecha: string; total: number; pedidos: number }>
  ventasPorAgente: Array<{ agente: string; total: number; pedidos: number }>
  porTipoSolicitud: Array<{ tipo: string; cantidad: number }>
  porTipoPedido: Array<{ tipo: string; cantidad: number }>
  porTurno: Array<{ turno: string; cantidad: number }>
  topPDV: Array<{ pdv: string; total: number }>
}

const COLORS = ["#3b82f6", "#f97316", "#a855f7", "#ec4899", "#10b981", "#eab308", "#6366f1", "#14b8a6", "#f43f5e", "#06b6d4"]

export default function ChartsGrid({ height = 300 }: { height?: number }) {
  const searchParams = useSearchParams()
  const [data, setData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        setLoading(true)
        const params = searchParams.toString()
        const res = await fetch(`/api/dashboard/charts?${params}`)
        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch (error) {
        console.error("Error cargando gráficos:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCharts()
  }, [searchParams])

  const renderEmpty = (title: string) => (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Sin datos disponibles
      </CardContent>
    </Card>
  )

  const renderSkeleton = (title: string) => (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center" style={{ height }}>
        <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-gray-400">
          Cargando gráfica...
        </div>
      </CardContent>
    </Card>
  )

  if (!mounted) return null

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {renderSkeleton("Ventas por Día")}
        {renderSkeleton("Ventas por Agente (Top 10)")}
        {renderSkeleton("Distribución por Tipo de Solicitud")}
        {renderSkeleton("Distribución por Tipo de Pedido")}
        {renderSkeleton("Pedidos por Turno")}
        {renderSkeleton("Top 10 PDV por Ventas")}
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. LineChart: Ventas por día */}
      {!data?.ventasPorDia || data.ventasPorDia.length === 0 ? renderEmpty("Ventas por Día") : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Ventas por Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height }}>
              <ResponsiveContainer>
                <LineChart data={data.ventasPorDia} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fecha" fontSize={10} tickLine={false} />
                  <YAxis 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `$${formatNumber(val / 1000)}k`} 
                  />
                  <Tooltip formatter={(value: any) => [formatCOP(Number(value)), "Ventas"]} labelClassName="text-xs font-semibold" />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. BarChart: Top 10 agentes por ventas */}
      {!data?.ventasPorAgente || data.ventasPorAgente.length === 0 ? renderEmpty("Ventas por Agente (Top 10)") : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Ventas por Agente (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height }}>
              <ResponsiveContainer>
                <BarChart data={data.ventasPorAgente} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="agente" fontSize={9} interval={0} angle={-30} textAnchor="end" tickLine={false} />
                  <YAxis 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `$${formatNumber(val / 1000)}k`} 
                  />
                  <Tooltip formatter={(value: any) => [formatCOP(Number(value)), "Ventas"]} labelClassName="text-xs font-semibold" />
                  <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. PieChart: Distribución por Tipo de Solicitud */}
      {!data?.porTipoSolicitud || data.porTipoSolicitud.length === 0 ? renderEmpty("Distribución por Tipo de Solicitud") : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Distribución por Tipo de Solicitud</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height }} className="flex items-center justify-center">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.porTipoSolicitud}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="cantidad"
                    nameKey="tipo"
                  >
                    {data.porTipoSolicitud.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, "Pedidos"]} labelClassName="text-xs font-semibold" />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. PieChart: Distribución por Tipo de Pedido */}
      {!data?.porTipoPedido || data.porTipoPedido.length === 0 ? renderEmpty("Distribución por Tipo de Pedido") : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Distribución por Tipo de Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height }} className="flex items-center justify-center">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.porTipoPedido}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="cantidad"
                    nameKey="tipo"
                    label={({ name, percent }: any) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.porTipoPedido.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, "Pedidos"]} labelClassName="text-xs font-semibold" />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. BarChart: Pedidos por turno */}
      {!data?.porTurno || data.porTurno.length === 0 ? renderEmpty("Pedidos por Turno") : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Pedidos por Turno</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height }}>
              <ResponsiveContainer>
                <BarChart data={data.porTurno} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="turno" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: any) => [value, "Pedidos"]} labelClassName="text-xs font-semibold" />
                  <Bar dataKey="cantidad" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. BarChart horizontal: Top 10 PDV */}
      {!data?.topPDV || data.topPDV.length === 0 ? renderEmpty("Top 10 PDV por Ventas") : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Top 10 PDV por Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height }}>
              <ResponsiveContainer>
                <BarChart data={data.topPDV} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis 
                    type="number" 
                    fontSize={10} 
                    tickLine={false} 
                    tickFormatter={(val) => `$${formatNumber(val / 1000)}k`} 
                  />
                  <YAxis dataKey="pdv" type="category" fontSize={9} tickLine={false} axisLine={false} width={80} />
                  <Tooltip formatter={(value: any) => [formatCOP(Number(value)), "Ventas"]} labelClassName="text-xs font-semibold" />
                  <Bar dataKey="total" fill="#ec4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value)
}
