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

    // Filtros base
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

    // 1. Ventas por Día
    const daily = await prisma.orderRecord.groupBy({
      by: ["fecha"],
      where: {
        ...where,
        fecha: { not: null }
      },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { fecha: "asc" }
    })
    const ventasPorDia = daily.map(d => ({
      fecha: d.fecha ? d.fecha.toISOString().split("T")[0] : "",
      total: d._sum.total || 0,
      pedidos: d._count.id || 0
    }))

    // 2. Ventas por Agente (Top 10)
    const agentSales = await prisma.orderRecord.groupBy({
      by: ["agente"],
      where: {
        ...where,
        agente: { not: null }
      },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: "desc" } },
      take: 10
    })
    const ventasPorAgente = agentSales.map(a => ({
      agente: a.agente || "Desconocido",
      total: a._sum.total || 0,
      pedidos: a._count.id || 0
    }))

    // 3. Distribución por Tipo de Solicitud
    const solType = await prisma.orderRecord.groupBy({
      by: ["tipoSolicitud"],
      where: {
        ...where,
        tipoSolicitud: { not: null }
      },
      _count: { id: true }
    })
    const porTipoSolicitud = solType.map(s => ({
      tipo: s.tipoSolicitud || "Otro",
      cantidad: s._count.id
    }))

    // 4. Distribución por Tipo de Pedido
    const pedType = await prisma.orderRecord.groupBy({
      by: ["tipoPedido"],
      where: {
        ...where,
        tipoPedido: { not: null }
      },
      _count: { id: true }
    })
    const porTipoPedido = pedType.map(p => ({
      tipo: p.tipoPedido || "Otro",
      cantidad: p._count.id
    }))

    // 5. Pedidos por Turno
    const turnData = await prisma.orderRecord.groupBy({
      by: ["turno"],
      where: {
        ...where,
        turno: { not: null }
      },
      _count: { id: true }
    })
    const porTurno = turnData.map(t => ({
      turno: t.turno || "Otro",
      cantidad: t._count.id
    }))

    // 6. Top 10 PDV por ventas
    const pdvSales = await prisma.orderRecord.groupBy({
      by: ["pdv"],
      where: {
        ...where,
        pdv: { not: null }
      },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 10
    })
    const topPDV = pdvSales.map(p => ({
      pdv: p.pdv || "Desconocido",
      total: p._sum.total || 0
    }))

    return NextResponse.json({
      ventasPorDia,
      ventasPorAgente,
      porTipoSolicitud,
      porTipoPedido,
      porTurno,
      topPDV
    })

  } catch (error: any) {
    console.error("Error cargando gráficos:", error)
    return NextResponse.json({ error: "Error al cargar gráficos", details: error.message }, { status: 500 })
  }
}
