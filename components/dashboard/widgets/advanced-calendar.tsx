"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MonthPicker from "@/components/dashboard/month-picker"
import ViewToggle, { ViewMode } from "@/components/dashboard/view-toggle"
import { getTipoHex } from "@/lib/tipo-colors"
import { CalendarDays, Loader2 } from "lucide-react"

interface DayData {
  dia: number
  fecha: string
  diaSemana: string
  total: number
  porTipo: Record<string, number>
}

interface CalendarData {
  calendar: DayData[]
  tiposDisponibles: string[]
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

// Color intensity based on value relative to max
function intensityBg(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-gray-100"
  const ratio = value / max
  if (ratio < 0.15) return "bg-blue-100"
  if (ratio < 0.30) return "bg-blue-200"
  if (ratio < 0.50) return "bg-blue-300"
  if (ratio < 0.70) return "bg-blue-400"
  if (ratio < 0.85) return "bg-blue-500"
  return "bg-blue-600"
}

function intensityText(value: number, max: number): string {
  if (max === 0 || value === 0) return "text-gray-400"
  const ratio = value / max
  return ratio >= 0.5 ? "text-white" : "text-blue-900"
}

// Spanish day abbreviations (Mon first)
const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
// Map JS getDay() (0=Sun…6=Sat) to Mon-first index
function toMonFirst(jsDay: number): number {
  return (jsDay + 6) % 7
}

export default function AdvancedCalendarWidget() {
  const [month, setMonth] = useState(currentMonth)
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/advanced/calendar?month=${month}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  // Build calendar grid
  const buildGrid = (calendar: DayData[]) => {
    if (!calendar.length) return { weeks: [], maxVal: 0 }
    const firstDay = new Date(calendar[0].fecha)
    const startOffset = toMonFirst(firstDay.getDay())
    const maxVal = Math.max(...calendar.map((d) => d.total), 1)

    const cells: (DayData | null)[] = [
      ...Array(startOffset).fill(null),
      ...calendar,
    ]
    const weeks: (DayData | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }
    return { weeks, maxVal }
  }

  const maxPorTipo = data
    ? Math.max(...data.calendar.flatMap((d) => Object.values(d.porTipo)), 1)
    : 1

  // ── View: Chart (heatmap calendar) ───────────────────────────────────────
  const renderChart = () => {
    if (!data) return null
    const { weeks, maxVal } = buildGrid(data.calendar)
    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-[9px] font-semibold text-gray-400 text-center">
              {d}
            </div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week[di] ?? null
              if (!cell) return <div key={di} className="aspect-square" />
              return (
                <div
                  key={cell.dia}
                  className={`aspect-square rounded flex flex-col items-center justify-center cursor-default transition-all group relative ${intensityBg(cell.total, maxVal)}`}
                  title={`${cell.fecha}: $${cell.total.toLocaleString("es-CO")}`}
                >
                  <span className={`text-[10px] font-bold leading-none ${intensityText(cell.total, maxVal)}`}>
                    {cell.dia}
                  </span>
                  {cell.total > 0 && (
                    <span className={`text-[8px] leading-none mt-0.5 ${intensityText(cell.total, maxVal)}`}>
                      {cell.total >= 1000
                        ? `${(cell.total / 1000).toFixed(0)}k`
                        : cell.total.toFixed(0)}
                    </span>
                  )}
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg pointer-events-none">
                    <p className="font-semibold">{cell.diaSemana} {cell.dia}</p>
                    <p>${cell.total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
                    {Object.entries(cell.porTipo).slice(0, 3).map(([t, v]) => (
                      <p key={t} style={{ color: getTipoHex(t) }}>
                        {t}: {v}
                      </p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-1 mt-2 justify-end">
          <span className="text-[9px] text-gray-400">Menos</span>
          {["bg-gray-100", "bg-blue-200", "bg-blue-400", "bg-blue-600"].map((c) => (
            <div key={c} className={`w-3 h-3 rounded ${c}`} />
          ))}
          <span className="text-[9px] text-gray-400">Más</span>
        </div>
      </div>
    )
  }

  // ── View: Card (summary stats) ───────────────────────────────────────────
  const renderCard = () => {
    if (!data) return null
    const active = data.calendar.filter((d) => d.total > 0)
    const totalMes = active.reduce((s, d) => s + d.total, 0)
    const peakDay = active.reduce((a, b) => (b.total > a.total ? b : a), active[0])
    const avgDay = active.length ? totalMes / active.length : 0

    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 col-span-2">
          <p className="text-xs text-gray-500">Total del mes</p>
          <p className="text-xl font-bold text-blue-700">
            ${totalMes.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-[10px] text-gray-500">Días con actividad</p>
          <p className="text-lg font-bold text-green-700">{active.length}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <p className="text-[10px] text-gray-500">Promedio/día</p>
          <p className="text-lg font-bold text-orange-700">
            ${avgDay.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
          </p>
        </div>
        {peakDay && (
          <div className="bg-purple-50 rounded-lg p-3 col-span-2">
            <p className="text-[10px] text-gray-500">Día pico</p>
            <p className="text-sm font-bold text-purple-700">
              {peakDay.diaSemana} {peakDay.dia} — ${peakDay.total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── View: Table ──────────────────────────────────────────────────────────
  const renderTable = () => {
    if (!data) return null
    const active = data.calendar.filter((d) => d.total > 0).reverse()
    return (
      <div className="overflow-auto max-h-64">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left pb-1 font-medium">Día</th>
              <th className="text-left pb-1 font-medium">Fecha</th>
              <th className="text-right pb-1 font-medium">Total $</th>
              <th className="text-right pb-1 font-medium">Pedidos</th>
            </tr>
          </thead>
          <tbody>
            {active.map((d) => (
              <tr key={d.dia} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-1 capitalize">{d.diaSemana}</td>
                <td className="py-1 text-gray-500">{d.fecha}</td>
                <td className="py-1 text-right font-medium">
                  ${d.total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                </td>
                <td className="py-1 text-right text-gray-500">
                  {Object.values(d.porTipo).reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </div>
          <CardTitle className="text-sm font-semibold text-gray-700">
            Actividad del Mes
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
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
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
