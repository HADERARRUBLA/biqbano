"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MonthPicker from "@/components/dashboard/month-picker"
import ViewToggle, { ViewMode } from "@/components/dashboard/view-toggle"
import { getTipoHex } from "@/lib/tipo-colors"
import { Grid3X3, Loader2 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface MatrixRow {
  tipo: string
  lunes: number
  martes: number
  miercoles: number
  jueves: number
  viernes: number
  sabado: number
  domingo: number
  total: number
}

interface MatrixData {
  matrix: MatrixRow[]
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
// Eje X del BarChart usa labels cortas
const DAY_CHART_DATA_KEYS = [
  { key: "lunes",     label: "Lun" },
  { key: "martes",    label: "Mar" },
  { key: "miercoles", label: "Mié" },
  { key: "jueves",    label: "Jue" },
  { key: "viernes",   label: "Vie" },
  { key: "sabado",    label: "Sáb" },
  { key: "domingo",   label: "Dom" },
]

// ── Helpers para heat matrix ─────────────────────────────────────────────────
function cellIntensity(value: number, rowMax: number): string {
  if (rowMax === 0 || value === 0) return "rgba(243,244,246,1)"
  const ratio = value / rowMax
  const alpha = 0.15 + ratio * 0.85
  return `rgba(99,102,241,${alpha.toFixed(2)})`
}

function textColor(value: number, rowMax: number): string {
  if (rowMax === 0 || value === 0) return "#9ca3af"
  return value / rowMax >= 0.5 ? "#ffffff" : "#1e1b4b"
}

export default function AdvancedWeekdayWidget() {
  const [month, setMonth] = useState(currentMonth)
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [data, setData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/advanced/weekday-matrix?month=${month}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  // ── Vista: Gráfica — BarChart agrupado (top 5 tipos) ──────────────────────
  const renderChart = () => {
    if (!data?.matrix.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    // Top 5 tipos por volumen total
    const top5 = data.matrix.slice(0, 5)

    // Transformar datos: un objeto por día con valor de cada tipo
    const chartData = DAY_CHART_DATA_KEYS.map(({ key, label }) => {
      const entry: Record<string, number | string> = { dia: label }
      for (const row of top5) {
        entry[row.tipo] = row[key as keyof MatrixRow] as number
      }
      return entry
    })

    return (
      <div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -22 }}
            barCategoryGap="20%"
            barGap={2}
          >
            <XAxis dataKey="dia" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 10, padding: "4px 8px" }}
              labelFormatter={(v) => `${v}`}
            />
            <Legend
              iconType="square"
              iconSize={7}
              wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
            />
            {top5.map((row) => (
              <Bar
                key={row.tipo}
                dataKey={row.tipo}
                fill={getTipoHex(row.tipo)}
                radius={[2, 2, 0, 0]}
                maxBarSize={18}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {top5.length < data.matrix.length && (
          <p className="text-[9px] text-gray-400 text-center mt-1">
            Mostrando top {top5.length} tipos de {data.matrix.length} totales
          </p>
        )}
      </div>
    )
  }

  // ── Vista: Card — resumen día/tipo ────────────────────────────────────────
  const renderCard = () => {
    if (!data?.matrix.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    const dayTotals = DAYS.map((d) => ({
      day: d,
      total: data.matrix.reduce((s, r) => s + r[d], 0),
    })).sort((a, b) => b.total - a.total)

    const peakDay = dayTotals[0]
    const slowDay = dayTotals[dayTotals.length - 1]

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-indigo-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Día más activo</p>
            <p className="text-sm font-bold text-indigo-700 capitalize">{peakDay?.day}</p>
            <p className="text-[10px] text-gray-500">{peakDay?.total} solicitudes</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Día más tranquilo</p>
            <p className="text-sm font-bold text-orange-700 capitalize">{slowDay?.day}</p>
            <p className="text-[10px] text-gray-500">{slowDay?.total} solicitudes</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {data.matrix.slice(0, 4).map((row) => {
            const peak = DAYS.reduce((b, d) => (row[d] > row[b] ? d : b), DAYS[0])
            return (
              <div key={row.tipo} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: getTipoHex(row.tipo) }}
                  />
                  <span className="text-gray-700">{row.tipo}</span>
                </div>
                <span className="text-gray-400 capitalize">pico: {peak} ({row[peak]})</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Vista: Tabla — heat matrix completa ───────────────────────────────────
  const renderTable = () => {
    if (!data?.matrix.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    return (
      <div className="overflow-auto max-h-72">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[10px] text-gray-500 font-medium pb-1 pr-2 min-w-[90px]">
                Tipo
              </th>
              {DAY_LABELS.map((d) => (
                <th key={d} className="text-center text-[10px] text-gray-500 font-medium pb-1 px-0.5">
                  {d}
                </th>
              ))}
              <th className="text-center text-[10px] text-gray-500 font-medium pb-1 px-1">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row) => {
              const rowMax = Math.max(...DAYS.map((d) => row[d]), 1)
              return (
                <tr key={row.tipo}>
                  <td className="pr-2 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: getTipoHex(row.tipo) }}
                      />
                      <span className="truncate text-[10px] text-gray-700 font-medium max-w-[80px]">
                        {row.tipo}
                      </span>
                    </div>
                  </td>
                  {DAYS.map((d) => (
                    <td key={d} className="px-0.5 py-0.5">
                      <div
                        className="rounded text-center font-bold leading-tight py-1 px-0.5"
                        style={{
                          background: cellIntensity(row[d], rowMax),
                          color: textColor(row[d], rowMax),
                          fontSize: "10px",
                          minWidth: "28px",
                        }}
                        title={`${row.tipo} - ${d}: ${row[d]}`}
                      >
                        {row[d] > 0 ? row[d] : ""}
                      </div>
                    </td>
                  ))}
                  <td className="px-1 py-0.5 text-center">
                    <span className="text-[10px] font-bold text-gray-700">{row.total}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Grid3X3 className="h-4 w-4 text-indigo-600" />
          </div>
          <CardTitle className="text-sm font-semibold text-gray-700">
            Distribución Día/Semana
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker value={month} onChange={setMonth} />
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        ) : !data ? (
          <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>
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
