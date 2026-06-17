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

    // Paginación
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const skip = (page - 1) * limit

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

    // Consultar datos paginados
    const [data, total] = await prisma.$transaction([
      prisma.orderRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { rowIndex: "asc" }
      }),
      prisma.orderRecord.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data,
      total,
      page,
      totalPages
    })

  } catch (error: any) {
    console.error("Error cargando pedidos:", error)
    return NextResponse.json({ error: "Error al cargar pedidos", details: error.message }, { status: 500 })
  }
}
