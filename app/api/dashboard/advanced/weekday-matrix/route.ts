import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

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

    // Traer fecha + tipoSolicitud de todos los registros del mes
    const records = await prisma.orderRecord.findMany({
      where: {
        tenantId,
        fecha: { gte: from, lte: to },
        tipoSolicitud: { not: null },
      },
      select: { fecha: true, tipoSolicitud: true },
    })

    // Mapear día de semana (0=dom…6=sáb) al nombre español
    const DAY_KEYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const
    type DayKey = (typeof DAY_KEYS)[number]

    // Acumular conteo por tipo × día de semana
    const matrixMap: Record<string, Record<DayKey, number>> = {}

    for (const r of records) {
      if (!r.fecha || !r.tipoSolicitud) continue
      const tipo = r.tipoSolicitud
      const dayIdx = new Date(r.fecha).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
      const dayKey = DAY_KEYS[dayIdx]

      if (!matrixMap[tipo]) {
        matrixMap[tipo] = {
          domingo: 0, lunes: 0, martes: 0,
          miercoles: 0, jueves: 0, viernes: 0, sabado: 0,
        }
      }
      matrixMap[tipo][dayKey]++
    }

    // Calcular totales y construir array ordenado por total desc
    const matrix = Object.entries(matrixMap)
      .map(([tipo, days]) => {
        const total = Object.values(days).reduce((a, b) => a + b, 0)
        return { tipo, ...days, total }
      })
      .sort((a, b) => b.total - a.total)

    return NextResponse.json({ matrix })
  } catch (error: any) {
    console.error("Error en weekday-matrix API:", error)
    return NextResponse.json(
      { error: "Error al cargar matriz", details: error.message },
      { status: 500 }
    )
  }
}
