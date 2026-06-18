"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MonthPicker from "@/components/dashboard/month-picker"
import ViewToggle, { ViewMode } from "@/components/dashboard/view-toggle"
import { getTipoHex, getTipoColor } from "@/lib/tipo-colors"
import { Clock, Loader2, ChevronDown } from "lucide-react"
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

// ── MultiSelect de tipos ─────────────────────────────────────────────────────
interface TipoMultiSelectProps {
  tipos: string[]
  selected: string[]
  onChange: (sel: string[]) => void
}

function TipoMultiSelect({ tipos, selected, onChange }: TipoMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggle = (tipo: string) => {
    if (selected.includes(tipo)) {
      if (selected.length === 1) return  // mantener al menos 1
      onChange(selected.filter((t) => t !== tipo))
    } else {
      onChange([...selected, tipo])
    }
  }

  const allSelected = selected.length === tipos.length

  const toggleAll = () => {
    onChange(allSelected ? [] : [...tipos])
  }

  const label =
    allSelected || selected.length === 0
      ? "Todos los tipos"
      : selected.length === 1
      ? selected[0]
      : `${selected.length} tipos`

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-1 hover:border-orange-300 transition-colors"
      >
        <span className="max-w-[80px] truncate">{label}</span>
        <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[160px] max-h-52 overflow-y-auto">
            <label className="flex items-center gap-2 px-1 py-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-3 w-3 rounded accent-orange-500"
              />
              <span className="text-[10px] font-semibold text-gray-600">Todos</span>
            </label>
            <div className="border-t border-gray-100 my-1" />
            {tipos.map((tipo) => {
              const color = getTipoColor(tipo)
              return (
                <label
                  key={tipo}
                  className="flex items-center gap-2 px-1 py-0.5 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(tipo)}
                    onChange={() => toggle(tipo)}
                    className="h-3 w-3 rounded"
                    style={{ accentColor: getTipoHex(tipo) }}
                  />
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: getTipoHex(tipo) }}
                  />
                  <span className={`text-[10px] ${color.text} truncate max-w-[110px]`}>
                    {tipo}
                  </span>
                </label>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Widget principal ─────────────────────────────────────────────────────────
export default function AdvancedHourlyWidget() {
  const [month, setMonth] = useState(currentMonth)
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [data, setData] = useState<HourlyData | null>(null)
  const [selectedTipos, setSelectedTipos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/advanced/hourly?month=${month}`)
      if (res.ok) {
        const d: HourlyData = await res.json()
        setData(d)
        setSelectedTipos(d.tiposDisponibles)  // todos por defecto
      }
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  // Tipos visibles = intersección de seleccionados y disponibles
  const visibleTipos = data
    ? data.tiposDisponibles.filter((t) => selectedTipos.includes(t))
    : []

  // Datos filtrados: recalcular total sólo con tipos visibles
  const filteredHourly = data
    ? data.hourly.map((row) => {
        const entry: HourlyRow = { hora: row.hora, label: row.label, total: 0 }
        for (const tipo of visibleTipos) {
          const v = (row[tipo] as number) || 0
          entry[tipo] = v
          entry.total += v
        }
        return entry
      })
    : []

  // ── Vista: Gráfica — Stacked Bar filtrado ────────────────────────────────
  const renderChart = () => {
    if (!filteredHourly.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={filteredHourly}
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
          {visibleTipos.map((tipo) => (
            <Bar key={tipo} dataKey={tipo} stackId="a" fill={getTipoHex(tipo)} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // ── Vista: Card — franjas horarias ───────────────────────────────────────
  const renderCard = () => {
    if (!filteredHourly.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    const sorted = [...filteredHourly].sort((a, b) => b.total - a.total)
    const peak = sorted[0]
    const slow = sorted[sorted.length - 1]
    const totalAll = filteredHourly.reduce((s, h) => s + h.total, 0)

    const manana = filteredHourly.filter((h) => h.hora >= 6 && h.hora < 12).reduce((s, h) => s + h.total, 0)
    const tarde = filteredHourly.filter((h) => h.hora >= 12 && h.hora < 18).reduce((s, h) => s + h.total, 0)
    const noche = filteredHourly.filter((h) => h.hora >= 18).reduce((s, h) => s + h.total, 0)

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

  // ── Vista: Tabla ─────────────────────────────────────────────────────────
  const renderTable = () => {
    if (!filteredHourly.length) return <div className="text-center text-sm text-gray-400 py-6">Sin datos</div>

    const withActivity = filteredHourly.filter((h) => h.total > 0)
    const showTipos = visibleTipos.slice(0, 3)

    return (
      <div className="overflow-auto max-h-64">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left pb-1 font-medium">Hora</th>
              <th className="text-right pb-1 font-medium">Total</th>
              {showTipos.map((t) => (
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
                {showTipos.map((t) => (
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
      <CardHeader className="p-3 pb-2 bg-gradient-to-r from-orange-50 to-amber-50">
        {/* Row 1: título + controles */}
        <div className="flex items-center justify-between gap-2">
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
        </div>
        {/* Row 2: MultiSelect (solo cuando hay datos) */}
        {data && data.tiposDisponibles.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-gray-500">Filtrar tipos:</span>
            <TipoMultiSelect
              tipos={data.tiposDisponibles}
              selected={selectedTipos}
              onChange={setSelectedTipos}
            />
          </div>
        )}
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
