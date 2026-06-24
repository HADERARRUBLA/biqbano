"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

interface SyncLog {
  id: string
  status: string
  rowsSynced: number
  error: string | null
  source?: string
  createdAt: string
}

interface DataSource {
  id: string
  sheetUrl: string
  tabName: string
  lastSyncAt: string | null
}

interface SyncStatusData {
  success: boolean
  dataSource: DataSource | null
  lastLog: SyncLog | null
  lastCronLog: SyncLog | null
  recentLogs: SyncLog[]
}

export default function SyncStatus({ refreshTrigger }: { refreshTrigger: number }) {
  const [data, setData] = useState<SyncStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/sync/status")
      if (!res.ok) throw new Error("Error cargando el estado")
      const result = await res.json()
      setData(result)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Error al obtener estado")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [refreshTrigger])

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Nunca"
    const now = new Date()
    const syncTime = new Date(dateStr)
    const diffMs = now.getTime() - syncTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "hace unos instantes"
    if (diffMins < 60) return `hace ${diffMins} minuto${diffMins > 1 ? "s" : ""}`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`
    
    const diffDays = Math.floor(diffHours / 24)
    return `hace ${diffDays} día${diffDays > 1 ? "s" : ""}`
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-6">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-2 text-sm text-gray-500">Cargando estado de sincronización...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-red-500 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </CardContent>
      </Card>
    )
  }

  const lastLog = data?.lastLog
  const lastCronLog = data?.lastCronLog
  const isSynced = lastLog && lastLog.status === "success"

  return (
    <div className="space-y-6">
      {/* Card Sincronización Automática */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Sincronización Automática</CardTitle>
            <Badge className="px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 border-green-200" variant="outline">
              Activa
            </Badge>
          </div>
          <CardDescription>
            Estado del Cron Job diario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-gray-500 block">Frecuencia</span>
              <span className="font-semibold block text-gray-900">
                Diaria (2:00 am Col)
              </span>
              <span className="text-xs text-gray-400 block mt-0.5">
                (7:00 am UTC)
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-500 block">Último cron ejecutado</span>
              <span className="font-semibold block text-gray-900 truncate" title={lastCronLog?.createdAt ? new Date(lastCronLog.createdAt).toLocaleString() : "Nunca"}>
                {lastCronLog?.createdAt ? new Date(lastCronLog.createdAt).toLocaleString() : "Nunca"}
              </span>
              {lastCronLog?.createdAt && (
                <span className="text-xs text-gray-400 block">
                  ({timeAgo(lastCronLog.createdAt)} — {lastCronLog.status === "success" ? `${lastCronLog.rowsSynced} filas` : "Error"})
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Estado del Origen de Datos</CardTitle>
            <Badge className="px-2.5 py-0.5 text-xs font-semibold" variant={isSynced ? "default" : "destructive"}>
              {isSynced ? "Sincronizado" : lastLog ? "Error" : "Sin sincronizar"}
            </Badge>
          </div>
          <CardDescription>
            Detalles de la última sincronización con Google Sheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-gray-500 block">Última sincronización</span>
              <span className="font-semibold block">
                {data?.dataSource?.lastSyncAt ? new Date(data.dataSource.lastSyncAt).toLocaleString() : "Nunca"}
              </span>
              <span className="text-xs text-gray-400">
                ({timeAgo(data?.dataSource?.lastSyncAt || null)})
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-500 block">Filas importadas</span>
              <span className="text-2xl font-bold block">
                {isSynced ? lastLog?.rowsSynced : 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-md">Historial de Sincronización (Últimos 5)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y text-sm">
            {!data?.recentLogs || data.recentLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No hay registros de sincronización
              </div>
            ) : (
              data.recentLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {log.status === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <span className="font-medium">
                        {log.status === "success" ? "Exitoso" : "Fallido"}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                        log.source === "cron" 
                          ? "bg-purple-50 text-purple-700 border-purple-200" 
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}>
                        {log.source === "cron" ? "Automático" : "Manual"}
                      </Badge>
                    </div>
                    {log.error && (
                      <p className="text-xs text-red-500 mt-1 bg-red-50 p-2 rounded">
                        {log.error}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold">{log.rowsSynced} filas</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
