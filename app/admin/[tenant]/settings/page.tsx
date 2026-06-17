"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import SyncStatus from "@/components/sync/sync-status"
import { HelpCircle, ChevronDown, ChevronUp, Save, RefreshCw } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const [sheetUrl, setSheetUrl] = useState("")
  const [tabName, setTabName] = useState("Sheet1")
  
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [syncProgress, setSyncProgress] = useState("")

  const [showHelp, setShowHelp] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Cargar configuración existente al iniciar
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/sync/status")
        if (res.ok) {
          const data = await res.json()
          if (data.dataSource) {
            setSheetUrl(data.dataSource.sheetUrl)
            setTabName(data.dataSource.tabName)
          }
        }
      } catch (error) {
        console.error("Error cargando configuración:", error)
      }
    }
    loadConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/datasource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl, tabName })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar")

      setMessage({ type: "success", text: "Configuración guardada correctamente." })
      setRefreshTrigger((prev) => prev + 1) // Refrescar estado
    } catch (err: any) {
      setMessage({ type: "error", text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromDate || !toDate) {
      setMessage({ type: "error", text: "Debes seleccionar ambas fechas para sincronizar." })
      return
    }

    setSyncing(true)
    setMessage(null)
    setSyncProgress("Conectando con Google Sheets...")

    // Simulador visual de progreso para una carga masiva
    const progressInterval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev.includes("Conectando")) return "Sincronizando... Procesando filas en lotes de 1000..."
        if (prev.includes("Procesando")) return "Sincronizando... Guardando registros en PostgreSQL..."
        return "Sincronizando... Espere por favor..."
      })
    }, 3000)

    try {
      const res = await fetch("/api/sync/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromDate, to: toDate })
      })

      clearInterval(progressInterval)

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.details || "Error al sincronizar")

      setMessage({ 
        type: "success", 
        text: `Sincronización exitosa. Se procesaron e importaron ${data.rowsSynced} filas correctamente.` 
      })
      setSyncProgress(`Sincronización completada. ${data.rowsSynced} filas procesadas.`)
      setRefreshTrigger((prev) => prev + 1) // Refrescar estado y logs
    } catch (err: any) {
      clearInterval(progressInterval)
      setMessage({ type: "error", text: err.message })
      setSyncProgress("")
      setRefreshTrigger((prev) => prev + 1) // Refrescar para ver el log de error
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 max-w-6xl mx-auto">
      <div className="space-y-6">
        {/* Formulario de Configuración */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Fuente de Datos</CardTitle>
            <CardDescription>
              Guarda la URL de tu origen en Google Sheets.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSave}>
            <CardContent className="space-y-4">
              {message && message.type === "success" && !syncing && (
                <div className="p-4 rounded-md text-sm bg-green-50 text-green-700 border border-green-200">
                  {message.text}
                </div>
              )}
              {message && message.type === "error" && (
                <div className="p-4 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
                  {message.text}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="sheetUrl">URL del Google Sheet</Label>
                <Input
                  id="sheetUrl"
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tabName">Nombre de la Pestaña (Tab)</Label>
                <Input
                  id="tabName"
                  type="text"
                  placeholder="Sheet1"
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Guardando..." : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Guardar configuración
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Formulario de Sincronización */}
        <Card>
          <CardHeader>
            <CardTitle>Sincronización por Rango de Fechas</CardTitle>
            <CardDescription>
              Sincroniza datos en lotes seleccionando un rango de fechas.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSync}>
            <CardContent className="space-y-4">
              {syncing && (
                <div className="p-4 rounded-md text-sm bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                  <span>{syncProgress}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">Desde</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                    disabled={syncing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">Hasta</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                    disabled={syncing}
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                variant="secondary"
                disabled={syncing || !sheetUrl || !fromDate || !toDate}
                className="w-full"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar rango
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Guía colapsable */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowHelp(!showHelp)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-sm">¿Cómo obtener la API Key?</CardTitle>
              </div>
              {showHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {showHelp && (
            <CardContent className="text-sm text-gray-600 space-y-2.5 border-t pt-4">
              <ol className="list-decimal pl-4 space-y-2">
                <li>Ve a <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">console.cloud.google.com</a>.</li>
                <li>Crea un proyecto nuevo o selecciona uno existente.</li>
                <li>Activa la API de Google Sheets buscando <strong>"Google Sheets API"</strong> en la barra de búsqueda y presionando <strong>Habilitar</strong>.</li>
                <li>Ve a la pestaña de <strong>Credenciales</strong> (menú lateral izquierdo, APIs y Servicios).</li>
                <li>Haz clic en <strong>Crear credencial</strong> y selecciona <strong>Clave de API (API Key)</strong>.</li>
                <li>Copia la API Key y pégala en tu archivo <code>.env</code> como <code>GOOGLE_SHEETS_API_KEY</code>.</li>
              </ol>
              <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded border mt-2">
                <strong>Nota:</strong> Para que la sincronización funcione, la hoja de cálculo de Google Sheets debe configurarse como pública ("Cualquier persona con el enlace puede leer") o bien compartirse con privilegios de lectura.
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      <div>
        <SyncStatus refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}
