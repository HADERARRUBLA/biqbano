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
    
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const agente = searchParams.get("agente")
    const pdv = searchParams.get("pdv")
    const tipoSolicitud = searchParams.get("tipoSolicitud")
    const tipoPedido = searchParams.get("tipoPedido")
    const turno = searchParams.get("turno")

    // Construir filtros
    const where: any = { tenantId }

    if (from && to) {
      where.fecha = {
        gte: new Date(from + "T00:00:00"),
        lte: new Date(to + "T23:59:59")
      }
    }

    if (agente) where.agente = agente
    if (pdv) where.pdv = pdv
    if (tipoSolicitud) where.tipoSolicitud = tipoSolicitud
    if (tipoPedido) where.tipoPedido = tipoPedido
    if (turno) where.turno = turno

    // 1. Total Ventas y Ticket Promedio
    const salesAggregate = await prisma.orderRecord.aggregate({
      where,
      _sum: { total: true },
      _count: { id: true },
      _avg: { total: true }
    })

    const totalVentas = salesAggregate._sum.total || 0
    const totalPedidos = salesAggregate._count.id || 0
    const ticketPromedio = salesAggregate._avg.total || 0

    // 2. Top Agente por total ventas
    const topAgenteGroup = await prisma.orderRecord.groupBy({
      by: ["agente"],
      where: {
        ...where,
        agente: { not: null }
      },
      _sum: { total: true },
      orderBy: {
        _sum: { total: "desc" }
      },
      take: 1
    })
    const topAgente = topAgenteGroup[0]?.agente || "N/A"

    // 3. Top PDV por total ventas
    const topPDVGroup = await prisma.orderRecord.groupBy({
      by: ["pdv"],
      where: {
        ...where,
        pdv: { not: null }
      },
      _sum: { total: true },
      orderBy: {
        _sum: { total: "desc" }
      },
      take: 1
    })
    const topPDV = topPDVGroup[0]?.pdv || "N/A"

    // 4. Pedidos antes de las 12
    const pedidosAntesDe12 = await prisma.orderRecord.count({
      where: {
        ...where,
        baseData: {
          path: ["antesDeLas12"],
          equals: "Sí"
        }
      }
    })

    const porcentajeAntesDe12 = totalPedidos > 0 
      ? Math.round((pedidosAntesDe12 / totalPedidos) * 100) 
      : 0

    return NextResponse.json({
      totalVentas,
      totalPedidos,
      ticketPromedio,
      topAgente,
      topPDV,
      pedidosAntesDe12,
      porcentajeAntesDe12
    })

  } catch (error: any) {
    console.error("Error cargando KPIs:", error)
    return NextResponse.json({ error: "Error al cargar KPIs", details: error.message }, { status: 500 })
  }
}
