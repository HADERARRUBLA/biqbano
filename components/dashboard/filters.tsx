"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Filter, X } from "lucide-react"

interface FilterOptions {
  agentes: string[]
  pdvs: string[]
  tiposSolicitud: string[]
  tiposPedido: string[]
}

export default function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<FilterOptions>({
    agentes: [],
    pdvs: [],
    tiposSolicitud: [],
    tiposPedido: []
  })

  // State local para los filtros
  const [from, setFrom] = useState(searchParams.get("from") || "")
  const [to, setTo] = useState(searchParams.get("to") || "")
  const [agente, setAgente] = useState(searchParams.get("agente") || "")
  const [pdv, setPdv] = useState(searchParams.get("pdv") || "")
  const [tipoSolicitud, setTipoSolicitud] = useState(searchParams.get("tipoSolicitud") || "")
  const [tipoPedido, setTipoPedido] = useState(searchParams.get("tipoPedido") || "")
  const [turno, setTurno] = useState(searchParams.get("turno") || "")

  // Cargar opciones dinámicas desde la API
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch("/api/dashboard/filters")
        if (res.ok) {
          const data = await res.json()
          setOptions(data)
        }
      } catch (error) {
        console.error("Error cargando opciones de filtro:", error)
      }
    }
    fetchOptions()
  }, [])

  // Sincronizar estado con URL si cambia externamente
  useEffect(() => {
    setFrom(searchParams.get("from") || "")
    setTo(searchParams.get("to") || "")
    setAgente(searchParams.get("agente") || "")
    setPdv(searchParams.get("pdv") || "")
    setTipoSolicitud(searchParams.get("tipoSolicitud") || "")
    setTipoPedido(searchParams.get("tipoPedido") || "")
    setTurno(searchParams.get("turno") || "")
  }, [searchParams])

  const handleApply = () => {
    const params = new URLSearchParams()
    
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (agente) params.set("agente", agente)
    if (pdv) params.set("pdv", pdv)
    if (tipoSolicitud) params.set("tipoSolicitud", tipoSolicitud)
    if (tipoPedido) params.set("tipoPedido", tipoPedido)
    if (turno) params.set("turno", turno)

    // Resetear paginación si se aplican nuevos filtros
    params.set("page", "1")

    router.push(`${pathname}?${params.toString()}`)
  }

  const handleClear = () => {
    setFrom("")
    setTo("")
    setAgente("")
    setPdv("")
    setTipoSolicitud("")
    setTipoPedido("")
    setTurno("")

    router.push(pathname)
  }

  return (
    <div className="sticky top-0 z-30 w-full bg-white/85 backdrop-blur border-b p-4 shadow-sm space-y-4 rounded-xl mb-6">
      <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
        <Filter className="h-4 w-4 text-primary" />
        Filtros de Búsqueda
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Rango de Fechas */}
        <div className="space-y-1">
          <Label htmlFor="from" className="text-xs">Desde</Label>
          <div className="relative">
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="text-xs h-9 pl-8"
            />
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="to" className="text-xs">Hasta</Label>
          <div className="relative">
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="text-xs h-9 pl-8"
            />
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Agente */}
        <div className="space-y-1">
          <Label htmlFor="agente" className="text-xs">Agente</Label>
          <select
            id="agente"
            value={agente}
            onChange={(e) => setAgente(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos</option>
            {options.agentes.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* PDV */}
        <div className="space-y-1">
          <Label htmlFor="pdv" className="text-xs">PDV</Label>
          <select
            id="pdv"
            value={pdv}
            onChange={(e) => setPdv(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos</option>
            {options.pdvs.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Tipo de Solicitud */}
        <div className="space-y-1">
          <Label htmlFor="tipoSolicitud" className="text-xs">Tipo Solicitud</Label>
          <select
            id="tipoSolicitud"
            value={tipoSolicitud}
            onChange={(e) => setTipoSolicitud(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos</option>
            {options.tiposSolicitud.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Tipo de Pedido */}
        <div className="space-y-1">
          <Label htmlFor="tipoPedido" className="text-xs">Tipo Pedido</Label>
          <select
            id="tipoPedido"
            value={tipoPedido}
            onChange={(e) => setTipoPedido(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos</option>
            {options.tiposPedido.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Turno */}
        <div className="space-y-1">
          <Label htmlFor="turno" className="text-xs">Turno</Label>
          <select
            id="turno"
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t">
        <Button variant="outline" size="sm" onClick={handleClear} className="text-xs h-8">
          <X className="mr-1 h-3.5 w-3.5" /> Limpiar
        </Button>
        <Button size="sm" onClick={handleApply} className="text-xs h-8">
          Aplicar filtros
        </Button>
      </div>
    </div>
  )
}
