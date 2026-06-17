"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { formatCOP, formatNumber } from "@/lib/format"
import { Download, ChevronLeft, ChevronRight, Loader2, FileSpreadsheet, FileText, FileDown } from "lucide-react"

interface OrderRecord {
  id: string
  rowIndex: number
  baseData: {
    fecha?: string
    dia?: string
    agente?: string
    usuario?: string
    turno?: string
    antesDeLas12?: string
    hora?: string
    celular?: string
    tipoSolicitud?: string
    pdv?: string
    total?: number | string
    tipoPedido?: string
  }
  syncedAt: string
}

export default function OrdersTable({ limit = 50 }: { limit?: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [data, setData] = useState<OrderRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const currentPage = parseInt(searchParams.get("page") || "1", 10)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams(searchParams.toString())
        params.set("limit", limit.toString())
        const res = await fetch(`/api/dashboard/orders?${params.toString()}`)
        if (res.ok) {
          const result = await res.json()
          setData(result.data)
          setTotal(result.total)
          setTotalPages(result.totalPages)
        }
      } catch (error) {
        console.error("Error cargando pedidos:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [searchParams, limit])

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  // ── Fetch ALL records for export (sin paginación) ──────────────────────────
  const fetchAllForExport = async (): Promise<OrderRecord[]> => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    params.set("limit", "99999")
    const res = await fetch(`/api/dashboard/orders?${params.toString()}`)
    if (!res.ok) return []
    const result = await res.json()
    return result.data || []
  }

  const getExportFilename = () => {
    const from = searchParams.get("from") || ""
    const to = searchParams.get("to") || ""
    const suffix = from && to ? `_${from}_${to}` : `_pagina_${currentPage}`
    return `pedidos${suffix}`
  }

  const handleExportCSV = () => {
    if (data.length === 0) return
    const headers = [
      "Fecha", "Dia", "Agente", "Usuario", "Turno", "Antes de las 12",
      "Hora", "Celular", "Tipo Solicitud", "PDV", "Total", "Tipo Pedido"
    ]
    const csvRows = [headers.join(",")]
    data.forEach((row) => {
      const b = row.baseData
      csvRows.push([
        `"${b.fecha || ""}"`, `"${b.dia || ""}"`, `"${b.agente || ""}"`,
        `"${b.usuario || ""}"`, `"${b.turno || ""}"`, `"${b.antesDeLas12 || ""}"`,
        `"${b.hora || ""}"`, `"${b.celular || ""}"`, `"${b.tipoSolicitud || ""}"`,
        `"${b.pdv || ""}"`, b.total || 0, `"${b.tipoPedido || ""}"`
      ].join(","))
    })
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${getExportFilename()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const allData = await fetchAllForExport()
      const { exportToExcel } = await import("@/lib/export")
      const from = searchParams.get("from") || ""
      const to = searchParams.get("to") || ""
      const title = from && to ? `${from} al ${to}` : "Todos los registros"
      await exportToExcel(allData, getExportFilename(), `Pedidos ${title}`)
    } catch (e) {
      console.error("Error exportando Excel:", e)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const allData = await fetchAllForExport()
      const { exportToPDF } = await import("@/lib/export")
      const filters: Record<string, string> = {}
      searchParams.forEach((v: string, k: string) => { if (v) filters[k] = v })
      await exportToPDF(allData, getExportFilename(), "Reporte de Pedidos", filters)
    } catch (e) {
      console.error("Error exportando PDF:", e)
    } finally {
      setExporting(false)
    }
  }

  const getTurnoBadge = (turno?: string) => {
    if (!turno) return null
    switch (turno.toLowerCase()) {
      case "mañana":
      case "manana":
        return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">Mañana</Badge>
      case "tarde":
        return <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200">Tarde</Badge>
      case "noche":
        return <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200">Noche</Badge>
      default:
        return <Badge variant="outline">{turno}</Badge>
    }
  }

  const getAntes12Badge = (val?: string) => {
    if (!val) return null
    const isYes = val.toLowerCase() === "si" || val.toLowerCase() === "sí"
    return (
      <Badge className={
        isYes 
          ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200" 
          : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
      }>
        {isYes ? "Sí" : "No"}
      </Badge>
    )
  }

  const startIdx = (currentPage - 1) * limit + 1
  const endIdx = Math.min(currentPage * limit, total)

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-md font-semibold">Listado de Pedidos Sincronizados</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={data.length === 0 || loading || exporting}>
              {exporting
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <Download className="mr-1.5 h-4 w-4" />}
              {exporting ? "Exportando..." : "Exportar"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-gray-500">Formato</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4 text-red-600" />
              PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
              <FileDown className="mr-2 h-4 w-4 text-gray-500" />
              CSV (página actual)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-sm text-gray-500 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Cargando registros...
          </div>
        ) : data.length === 0 ? (
          <div className="text-center p-12 text-sm text-gray-400">
            No se encontraron registros con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Fila</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Día</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead className="text-center">Antes 12</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Celular</TableHead>
                  <TableHead>Tipo Solicitud</TableHead>
                  <TableHead>PDV</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Tipo Pedido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const b = row.baseData
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-center text-gray-400 text-xs">{row.rowIndex}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{b.fecha || "-"}</TableCell>
                      <TableCell className="text-xs">{b.dia || "-"}</TableCell>
                      <TableCell className="font-medium text-xs">{b.agente || "-"}</TableCell>
                      <TableCell className="text-xs">{b.usuario || "-"}</TableCell>
                      <TableCell className="text-xs">{getTurnoBadge(b.turno)}</TableCell>
                      <TableCell className="text-center text-xs">{getAntes12Badge(b.antesDeLas12)}</TableCell>
                      <TableCell className="text-xs">{b.hora || "-"}</TableCell>
                      <TableCell className="text-xs">{b.celular || "-"}</TableCell>
                      <TableCell className="text-xs">{b.tipoSolicitud || "-"}</TableCell>
                      <TableCell className="text-xs">{b.pdv || "-"}</TableCell>
                      <TableCell className="text-right font-semibold text-xs">
                        {b.total ? formatCOP(Number(b.total)) : "-"}
                      </TableCell>
                      <TableCell className="text-xs">{b.tipoPedido || "-"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {data.length > 0 && !loading && (
        <CardFooter className="flex items-center justify-between border-t p-4 text-xs text-gray-500">
          <div>
            Mostrando <span className="font-semibold">{startIdx}</span>-
            <span className="font-semibold">{endIdx}</span> de{" "}
            <span className="font-semibold">{total}</span> registros
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-3 font-medium">
              Pág. {currentPage} de {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
