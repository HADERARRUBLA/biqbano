"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MonthPicker from "@/components/dashboard/month-picker"
import ViewToggle, { ViewMode } from "@/components/dashboard/view-toggle"
import { getTipoHex } from "@/lib/tipo-colors"
import { PieChart, Loader2 } from "lucide-react"
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface ParticipationItem {
  tipo: string
  cantidad: number
  porcentaje: number
}

interface ParticipationData {
  participation: ParticipationItem[]
  total: number
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default function AdvancedParticipationWidget() {
  const [month, setMonth] = useState(currentMonth)
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [data, setData] = useState<ParticipationData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/advanced/participation?month=${month}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  // ── Chart: Donut ──────────────────────────────────────────────────────
  const renderChart = () => {
    if (!data?.participation.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    const chartData = data.participation.map((p) => ({
      name: p.tipo,
      value: p.cantidad,
    }))

    return (
      <div>
        <ResponsiveContainer width="100%" height={220}>
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={getTipoHex(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const v = typeof value === "number" ? value : 0
                const pct = data.participation.find((p) => p.tipo === name)?.porcentaje ?? 0
                return [`${v} (${pct}%)`, name as string]
              }}
              contentStyle={{ fontSize: 11, padding: "4px 8px" }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              formatter={(value) =>
                `${value} (${data.participation.find((p) => p.tipo === value)?.porcentaje ?? 0}%)`
              }
            />
          </RechartsPieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="text-center -mt-2">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-lg font-bold text-gray-700">{data.total.toLocaleString()}</p>
        </div>
      </div>
    )
  }

  // ── Card: Ranking ─────────────────────────────────────────────────────
  const renderCard = () => {
    if (!data?.participation.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-gray-400 px-1 pb-1 border-b">
          <span>Tipo</span>
          <span>Cant. / %</span>
        </div>
        {data.participation.map((p, idx) => (
          <div key={p.tipo} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-mono text-[10px]">#{idx + 1}</span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: getTipoHex(p.tipo) }}
                />
                <span className="text-gray-700 font-medium">{p.tipo}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-700">{p.cantidad.toLocaleString()}</span>
                <span className="text-gray-400 ml-1">({p.porcentaje}%)</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${p.porcentaje}%`,
                  background: getTipoHex(p.tipo),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Table ─────────────────────────────────────────────────────────────
  const renderTable = () => {
    if (!data?.participation.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    return (
      <div className="overflow-auto max-h-64">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left pb-1 font-medium">#</th>
              <th className="text-left pb-1 font-medium">Tipo</th>
              <th className="text-right pb-1 font-medium">Cantidad</th>
              <th className="text-right pb-1 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {data.participation.map((p, idx) => (
              <tr key={p.tipo} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-1 text-gray-400">{idx + 1}</td>
                <td className="py-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: getTipoHex(p.tipo) }}
                    />
                    {p.tipo}
                  </div>
                </td>
                <td className="py-1 text-right font-medium">{p.cantidad.toLocaleString()}</td>
                <td className="py-1 text-right text-gray-500">{p.porcentaje}%</td>
              </tr>
            ))}
            <tr className="border-t border-gray-200 font-bold">
              <td colSpan={2} className="py-1 text-gray-600">Total</td>
              <td className="py-1 text-right">{data.total.toLocaleString()}</td>
              <td className="py-1 text-right">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 rounded-lg">
            <PieChart className="h-4 w-4 text-purple-600" />
          </div>
          <CardTitle className="text-sm font-semibold text-gray-700">
            Participación por Tipo
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker value={month} onChange={setMonth} />
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : !data ? (
          <div className="text-center text-sm text-gray-400 py-8">Sin datos</div>
        ) : viewMode === "chart" ? (
          renderChart()
        ) : viewMode === "card" ? (
          renderCard()
        ) : (
          renderTable()
        )}
      </CardContent>
    </Card>
  )
}
