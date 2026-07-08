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
    
    // Filtros globales
    const agente = searchParams.get("agente")
    const pdv = searchParams.get("pdv")
    const tipoSolicitud = searchParams.get("tipoSolicitud")
    const tipoPedido = searchParams.get("tipoPedido")
    const turno = searchParams.get("turno")

    const where: any = {
      tenantId,
      fecha: { gte: from, lte: to },
      tipoSolicitud: { not: null },
    }
    
    if (agente) where.agente = agente
    if (pdv) where.pdv = pdv
    if (tipoSolicitud) where.tipoSolicitud = tipoSolicitud
    if (tipoPedido) where.tipoPedido = tipoPedido
    if (turno) where.turno = turno

    // Agrupar por tipoSolicitud
    const grouped = await prisma.orderRecord.groupBy({
      by: ["tipoSolicitud"],
      where,
      _count: { id: true },
    })

    const total = grouped.reduce((sum, g) => sum + g._count.id, 0)

    const participation = grouped
      .map((g) => ({
        tipo: g.tipoSolicitud || "Otro",
        cantidad: g._count.id,
        porcentaje: total > 0 ? Math.round((g._count.id / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)

    return NextResponse.json({ participation, total })
  } catch (error: any) {
    console.error("Error en participation API:", error)
    return NextResponse.json(
      { error: "Error al cargar participación", details: error.message },
      { status: 500 }
    )
  }
}
