"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MonthPicker from "@/components/dashboard/month-picker"
import ViewToggle, { ViewMode } from "@/components/dashboard/view-toggle"
import { getTipoHex } from "@/lib/tipo-colors"
import { Clock, Loader2 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface HourlyRow {
  hora: number
  label: string
  total: number
  [tipo: string]: number | string
}

interface HourlyData {
  hourly: HourlyRow[]
  tiposDisponibles: string[]
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default function AdvancedHourlyWidget() {
  const [month, setMonth] = useState(currentMonth)
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [data, setData] = useState<HourlyData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/advanced/hourly?month=${month}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  // ── Chart: Stacked bar ────────────────────────────────────────────────
  const renderChart = () => {
    if (!data?.hourly.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    const tipos = data.tiposDisponibles

    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data.hourly}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          barSize={14}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9 }}
            tickFormatter={(v) => v.replace(":00", "")}
          />
          <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 10, padding: "4px 8px" }}
            labelFormatter={(label) => `${label}h`}
          />
          <Legend
            iconType="square"
            iconSize={7}
            wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
          />
          {tipos.map((tipo) => (
            <Bar key={tipo} dataKey={tipo} stackId="a" fill={getTipoHex(tipo)} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // ── Card: Peak hours ──────────────────────────────────────────────────
  const renderCard = () => {
    if (!data?.hourly.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    const sorted = [...data.hourly].sort((a, b) => b.total - a.total)
    const peak = sorted[0]
    const slow = sorted[sorted.length - 1]
    const totalAll = data.hourly.reduce((s, h) => s + h.total, 0)

    // Group by time blocks
    const manana = data.hourly.filter((h) => h.hora >= 6 && h.hora < 12).reduce((s, h) => s + h.total, 0)
    const tarde = data.hourly.filter((h) => h.hora >= 12 && h.hora < 18).reduce((s, h) => s + h.total, 0)
    const noche = data.hourly.filter((h) => h.hora >= 18).reduce((s, h) => s + h.total, 0)

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "🌅 Mañana", value: manana },
            { label: "🌤️ Tarde", value: tarde },
            { label: "🌙 Noche", value: noche },
          ].map((b) => (
            <div key={b.label} className="bg-orange-50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-500">{b.label}</p>
              <p className="text-sm font-bold text-orange-700">{b.value}</p>
              <p className="text-[9px] text-gray-400">
                {totalAll > 0 ? Math.round((b.value / totalAll) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Hora pico</p>
            <p className="text-sm font-bold text-green-700">{peak?.label}</p>
            <p className="text-[10px] text-gray-400">{peak?.total} solicitudes</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Hora más tranquila</p>
            <p className="text-sm font-bold text-gray-600">{slow?.label}</p>
            <p className="text-[10px] text-gray-400">{slow?.total} solicitudes</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Table ─────────────────────────────────────────────────────────────
  const renderTable = () => {
    if (!data?.hourly.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    const withActivity = data.hourly.filter((h) => h.total > 0)

    return (
      <div className="overflow-auto max-h-64">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left pb-1 font-medium">Hora</th>
              <th className="text-right pb-1 font-medium">Total</th>
              {data.tiposDisponibles.slice(0, 3).map((t) => (
                <th key={t} className="text-right pb-1 font-medium truncate max-w-[60px]">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {withActivity.map((h) => (
              <tr key={h.hora} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-1 font-medium text-gray-700">{h.label}</td>
                <td className="py-1 text-right font-bold text-gray-700">{h.total}</td>
                {data.tiposDisponibles.slice(0, 3).map((t) => (
                  <td key={t} className="py-1 text-right text-gray-500">
                    {(h[t] as number) || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-100 rounded-lg">
            <Clock className="h-4 w-4 text-orange-600" />
          </div>
          <CardTitle className="text-sm font-semibold text-gray-700">
            Distribución por Hora
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
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
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
