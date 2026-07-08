import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

/**
 * Parsea la columna "hora" del Sheet que viene como "7:00 a.m." o "12:00 p.m."
 * Retorna la hora en formato 24h (0-23) o null si no se puede parsear.
 */
function parseHora(horaStr: string | null | undefined): number | null {
  if (!horaStr) return null
  
  const str = horaStr.toLowerCase().trim()
  
  // Detectar AM/PM
  const isAM = str.includes('a.m.') || str.includes('am')
  const isPM = str.includes('p.m.') || str.includes('pm')
  
  // Extraer número de hora
  const match = str.match(/(\d+):?(\d*)/)
  if (!match) return null
  
  let hour = parseInt(match[1])
  
  // Convertir a formato 24 horas
  if (isPM && hour !== 12) {
    hour += 12  // 6:00 p.m. → 18, 7:00 p.m. → 19
  } else if (isAM && hour === 12) {
    hour = 0    // 12:00 a.m. → 0 (medianoche)
  }
  // 12:00 p.m. → 12 (mediodía, correcto)
  // 11:00 a.m. → 11 (correcto)
  
  return hour
}

function formatHoraLabel(hour: number): string {
  if (hour === 0) return '12:00 am'
  if (hour === 12) return '12:00 pm'
  if (hour < 12) return `${hour}:00 am`
  return `${hour - 12}:00 pm`
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const { searchParams } = new URL(req.url)

    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7)
    const [year, monthNum] = month.split("-").map(Number)
    const from = new Date(year, monthNum - 1, 1)
    const to = new Date(year, monthNum, 0, 23, 59, 59)

    // Traer fecha, tipoSolicitud y baseData (donde está la hora)
    const records = await prisma.orderRecord.findMany({
      where: {
        tenantId,
        fecha: { gte: from, lte: to },
        tipoSolicitud: { not: null },
      },
      select: { tipoSolicitud: true, baseData: true },
    })

    // Acumular por hora × tipo
    // hourlyMap: { "7": { "Venta": 5, "Sin Respuesta": 2 }, ... }
    const hourlyMap: Record<number, Record<string, number>> = {}

    for (const r of records) {
      const baseData = r.baseData as Record<string, any>
      // El campo hora puede venir como "Hora", "hora", "HORA", "hora_solicitud"
      const horaRaw =
        baseData?.["Hora"] ??
        baseData?.["hora"] ??
        baseData?.["HORA"] ??
        baseData?.["hora_solicitud"] ??
        null

      const hour = parseHora(horaRaw)
      if (hour === null) continue

      const tipo = r.tipoSolicitud || "Otro"

      if (!hourlyMap[hour]) hourlyMap[hour] = {}
      hourlyMap[hour][tipo] = (hourlyMap[hour][tipo] || 0) + 1
    }

    // Construir array de 24 horas
    const allTypes = new Set<string>()
    Object.values(hourlyMap).forEach((types) => {
      Object.keys(types).forEach((t) => allTypes.add(t))
    })
    const tiposDisponibles = Array.from(allTypes).sort()

    const hourly = Array.from({ length: 24 }, (_, hour) => {
      const tipos: Record<string, number> = {}
      for (const tipo of tiposDisponibles) {
        tipos[tipo] = hourlyMap[hour]?.[tipo] || 0
      }
      const total = Object.values(tipos).reduce((a, b) => a + b, 0)
      return { hora: hour, label: formatHoraLabel(hour), total, ...tipos }
    })

    // Filtra solo horas entre 10 y 22 (10am a 10pm). Si hay datos fuera de ese rango, inclúyelos
    const hourlyFiltered = hourly.filter((h) => (h.hora >= 10 && h.hora <= 22) || h.total > 0)

    return NextResponse.json({ hourly: hourlyFiltered, tiposDisponibles })
  } catch (error: any) {
    console.error("Error en hourly API:", error)
    return NextResponse.json(
      { error: "Error al cargar distribución horaria", details: error.message },
      { status: 500 }
    )
  }
}
