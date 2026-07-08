"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MonthPicker from "@/components/dashboard/month-picker"
import ViewToggle, { ViewMode } from "@/components/dashboard/view-toggle"
import { getTipoHex, getTipoColor } from "@/lib/tipo-colors"
import { CalendarDays, Loader2, ChevronDown } from "lucide-react"

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

function formatCurrencyAbbreviated(value: number): string {
  if (value < 1000000) {
    return `$${value.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`
  }
  if (value < 1000000000) {
    const v = value / 1000000
    return `$${v.toLocaleString("es-CO", { maximumFractionDigits: 1 })}M`
  }
  const v = value / 1000000000
  return `$${v.toLocaleString("es-CO", { maximumFractionDigits: 1 })}B`
}

// ── Intensidad de color ──────────────────────────────────────────────────────
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

// Lun primero
const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
function toMonFirst(jsDay: number): number {
  return (jsDay + 6) % 7
}

// ── MultiSelect compacto ─────────────────────────────────────────────────────
interface TipoMultiSelectProps {
  tipos: string[]
  selected: string[]
  onChange: (sel: string[]) => void
}

function TipoMultiSelect({ tipos, selected, onChange }: TipoMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggle = (tipo: string) => {
    if (selected.includes(tipo)) {
      // No dejar vacío — si es el último, ignorar
      if (selected.length === 1) return
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
        className="flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-md px-2 py-1 hover:border-blue-300 transition-colors"
      >
        <span className="max-w-[80px] truncate">{label}</span>
        <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[160px] max-h-52 overflow-y-auto">
            {/* Todos */}
            <label className="flex items-center gap-2 px-1 py-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-3 w-3 rounded accent-blue-500"
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
export default function AdvancedCalendarWidget() {
  const [month, setMonth] = useState(currentMonth)
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [allData, setAllData] = useState<CalendarData | null>(null)   // datos completos (sin filtro)
  const [filteredData, setFilteredData] = useState<CalendarData | null>(null) // datos con filtro
  const [selectedTipos, setSelectedTipos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  const buildUrl = useCallback((monthStr: string, tiposStr?: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    params.set("month", monthStr)
    if (tiposStr) params.set("tipos", tiposStr)
    params.delete("from")
    params.delete("to")
    return `/api/dashboard/advanced/calendar?${params.toString()}`
  }, [searchParams])

  // Carga inicial
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(buildUrl(month))
      if (res.ok) {
        const data: CalendarData = await res.json()
        setAllData(data)
        
        let initialTipos = ["Venta", "Sin Respuesta", "Información", "PQR"]
        if (typeof window !== "undefined") {
          try {
            const stored = localStorage.getItem("biqbano_calendar_tipos")
            if (stored) {
               const parsed = JSON.parse(stored)
               if (Array.isArray(parsed) && parsed.length > 0) {
                  initialTipos = parsed
               }
            }
          } catch (e) {}
        }
        
        setSelectedTipos(initialTipos)
        
        // Si no se seleccionan todos, hacer fetch inicial filtrado
        if (initialTipos.length > 0 && initialTipos.length !== data.tiposDisponibles.length) {
          const q = initialTipos.map(encodeURIComponent).join(",")
          const res2 = await fetch(buildUrl(month, q))
          if (res2.ok) {
            const fData: CalendarData = await res2.json()
            setFilteredData({ ...fData, tiposDisponibles: data.tiposDisponibles })
          } else {
            setFilteredData(data)
          }
        } else {
          setFilteredData(data)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { loadAll() }, [loadAll])

  // Re-fetch filtrado cuando cambia selección
  const applyFilter = useCallback(
    async (tipos: string[]) => {
      if (!allData) return
      // Si todos seleccionados, usar datos ya cargados
      if (tipos.length === allData.tiposDisponibles.length || tipos.length === 0) {
        setFilteredData(allData)
        return
      }
      setLoading(true)
      try {
        const q = tipos.map(encodeURIComponent).join(",")
        const res = await fetch(buildUrl(month, q))
        if (res.ok) {
          const data: CalendarData = await res.json()
          // Preservar tiposDisponibles del allData
          setFilteredData({ ...data, tiposDisponibles: allData.tiposDisponibles })
        }
      } finally {
        setLoading(false)
      }
    },
    [month, allData, buildUrl]
  )

  const handleTipoChange = (sel: string[]) => {
    setSelectedTipos(sel)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("biqbano_calendar_tipos", JSON.stringify(sel))
      } catch (e) {}
    }
    applyFilter(sel)
  }

  const data = filteredData

  // ── Build grid ─────────────────────────────────────────────────────────
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

  // ── Vista: Gráfica (heatmap) ───────────────────────────────────────────
  const renderChart = () => {
    if (!data) return null
    const { weeks, maxVal } = buildGrid(data.calendar)
    
    // Max count for proportional bars
    const maxCountMonth = Math.max(
      ...data.calendar.map(d => Math.max(...Object.values(d.porTipo), 0)),
      1
    )
    return (
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-[9px] font-semibold text-gray-400 text-center">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week[di] ?? null
              if (!cell) return <div key={di} className="min-h-[80px]" />
              return (
                <div
                  key={cell.dia}
                  className={`min-h-[80px] h-full w-full rounded flex flex-col items-center justify-start p-1 cursor-default transition-all group relative ${intensityBg(cell.total, maxVal)}`}
                  title={`${cell.fecha}: $${cell.total.toLocaleString("es-CO")}`}
                >
                  <span className={`text-[10px] font-bold leading-none ${intensityText(cell.total, maxVal)}`}>
                    {cell.dia}
                  </span>
                  {cell.total > 0 && (
                    <span className={`text-[9px] font-medium leading-none mt-1 ${intensityText(cell.total, maxVal)}`}>
                      {formatCurrencyAbbreviated(cell.total)}
                    </span>
                  )}
                  
                  {cell.total > 0 && selectedTipos.length > 0 && (
                    <div className="flex flex-col w-full mt-2 gap-1 px-0.5">
                      {selectedTipos.map(tipo => {
                        const val = cell.porTipo[tipo] || 0
                        if (val === 0) return null
                        return (
                          <div key={tipo} className="w-full flex flex-col">
                            <div className="flex justify-between items-center text-[7px] leading-none mb-[2px]">
                              <span className={`truncate max-w-[70%] font-medium ${intensityText(cell.total, maxVal)}`}>{tipo}</span>
                              <span className={`font-bold ${intensityText(cell.total, maxVal)}`}>{val}</span>
                            </div>
                            <div className="w-full bg-black/10 rounded-full h-1 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(val / maxCountMonth) * 100}%`, backgroundColor: getTipoHex(tipo) }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg pointer-events-none">
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

  // ── Vista: Card (resumen) ─────────────────────────────────────────────
  const renderCard = () => {
    if (!data) return null
    const active = data.calendar.filter((d) => d.total > 0)
    const totalMes = active.reduce((s, d) => s + d.total, 0)
    const peakDay = active.length
      ? active.reduce((a, b) => (b.total > a.total ? b : a), active[0])
      : null
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

  // ── Vista: Tabla ──────────────────────────────────────────────────────
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
      <CardHeader className="p-3 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
        {/* Row 1: título + controles */}
        <div className="flex items-center justify-between gap-2">
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
        </div>
        {/* Row 2: MultiSelect de tipos (solo cuando hay datos) */}
        {allData && allData.tiposDisponibles.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-gray-500">Filtrar tipos:</span>
            <TipoMultiSelect
              tipos={allData.tiposDisponibles}
              selected={selectedTipos}
              onChange={handleTipoChange}
            />
          </div>
        )}
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
