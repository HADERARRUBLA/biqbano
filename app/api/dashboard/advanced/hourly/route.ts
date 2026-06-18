import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

/**
 * Parsea la columna "hora" del Sheet que viene como "7:00 a.m." o "12:00 p.m."
 * Retorna la hora en formato 24h (0-23) o null si no se puede parsear.
 */
function parseHora(horaStr: string | null | undefined): number | null {
  if (!horaStr) return null
  const s = horaStr.trim().toLowerCase()

  // Formato: "7:00 a.m." | "12:00 p.m." | "7:00 am" | "14:00"
  const match = s.match(/^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const period = match[3]?.replace(/\./g, "")

  if (period === "pm" && hours !== 12) hours += 12
  if (period === "am" && hours === 12) hours = 0

  return hours >= 0 && hours <= 23 ? hours : null
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
      return { hora: hour, label: `${hour.toString().padStart(2, "0")}:00`, total, ...tipos }
    })

    // Filtrar horas con actividad (opcional: retornar todas de 6 a 21)
    const hourlyFiltered = hourly.filter((h) => h.hora >= 6 && h.hora <= 22)

    return NextResponse.json({ hourly: hourlyFiltered, tiposDisponibles })
  } catch (error: any) {
    console.error("Error en hourly API:", error)
    return NextResponse.json(
      { error: "Error al cargar distribución horaria", details: error.message },
      { status: 500 }
    )
  }
}
