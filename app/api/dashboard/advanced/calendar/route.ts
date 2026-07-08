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

    // month = "2026-01"
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7)
    const tiposParam = searchParams.get("tipos") // CSV: "Venta,Sin Respuesta"
    
    // Filtros globales
    const agente = searchParams.get("agente")
    const pdv = searchParams.get("pdv")
    const tipoSolicitud = searchParams.get("tipoSolicitud")
    const tipoPedido = searchParams.get("tipoPedido")
    const turno = searchParams.get("turno")

    const [year, monthNum] = month.split("-").map(Number)
    const from = new Date(year, monthNum - 1, 1)
    const to = new Date(year, monthNum, 0, 23, 59, 59) // último día del mes

    const where: any = {
      tenantId,
      fecha: { gte: from, lte: to },
    }

    if (agente) where.agente = agente
    if (pdv) where.pdv = pdv
    if (tipoPedido) where.tipoPedido = tipoPedido
    if (turno) where.turno = turno

    if (tipoSolicitud) {
      where.tipoSolicitud = tipoSolicitud
    } else if (tiposParam) {
      const tipos = tiposParam.split(",").map((t) => t.trim()).filter(Boolean)
      if (tipos.length > 0) {
        where.tipoSolicitud = { in: tipos }
      }
    }

    // Traer todos los registros del mes (fecha + tipoSolicitud + total)
    const records = await prisma.orderRecord.findMany({
      where: { ...where, tipoSolicitud: { not: null } },
      select: { fecha: true, tipoSolicitud: true, total: true },
    })

    // Obtener todos los tipos disponibles en el mes (sin filtro de tipo específico para la lista)
    const tiposWhere = { ...where }
    delete tiposWhere.tipoSolicitud // No restringir la lista por el filtro de tipo

    const allTiposRaw = await prisma.orderRecord.groupBy({
      by: ["tipoSolicitud"],
      where: {
        ...tiposWhere,
        tipoSolicitud: { not: null },
      },
      _count: { id: true },
    })
    const tiposDisponibles = allTiposRaw
      .map((t) => t.tipoSolicitud as string)
      .filter(Boolean)
      .sort()

    // Agrupar por día
    const daysInMonth = to.getDate()
    const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]

    const calendarMap: Record<
      number,
      { total: number; porTipo: Record<string, number> }
    > = {}

    for (const r of records) {
      if (!r.fecha) continue
      const day = new Date(r.fecha).getDate()
      if (!calendarMap[day]) calendarMap[day] = { total: 0, porTipo: {} }
      calendarMap[day].total += r.total || 0
      const tipo = r.tipoSolicitud || "Otro"
      calendarMap[day].porTipo[tipo] = (calendarMap[day].porTipo[tipo] || 0) + 1
    }

    const calendar = Array.from({ length: daysInMonth }, (_, i) => {
      const dia = i + 1
      const date = new Date(year, monthNum - 1, dia)
      return {
        dia,
        fecha: date.toISOString().split("T")[0],
        diaSemana: DIAS_SEMANA[date.getDay()],
        total: Math.round((calendarMap[dia]?.total || 0) * 100) / 100,
        porTipo: calendarMap[dia]?.porTipo || {},
      }
    })

    return NextResponse.json({ calendar, tiposDisponibles })
  } catch (error: any) {
    console.error("Error en calendar API:", error)
    return NextResponse.json(
      { error: "Error al cargar calendario", details: error.message },
      { status: 500 }
    )
  }
}
