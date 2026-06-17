import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Obtener valores únicos reales en la base de datos
    const [agentesRaw, pdvsRaw, solicitudesRaw, pedidosRaw] = await prisma.$transaction([
      prisma.orderRecord.findMany({
        where: { tenantId, agente: { not: null } },
        select: { agente: true },
        distinct: ["agente"]
      }),
      prisma.orderRecord.findMany({
        where: { tenantId, pdv: { not: null } },
        select: { pdv: true },
        distinct: ["pdv"]
      }),
      prisma.orderRecord.findMany({
        where: { tenantId, tipoSolicitud: { not: null } },
        select: { tipoSolicitud: true },
        distinct: ["tipoSolicitud"]
      }),
      prisma.orderRecord.findMany({
        where: { tenantId, tipoPedido: { not: null } },
        select: { tipoPedido: true },
        distinct: ["tipoPedido"]
      })
    ])

    const agentes = agentesRaw.map(a => a.agente).filter(Boolean).sort()
    const pdvs = pdvsRaw.map(p => p.pdv).filter(Boolean).sort()
    const tiposSolicitud = solicitudesRaw.map(s => s.tipoSolicitud).filter(Boolean).sort()
    const tiposPedido = pedidosRaw.map(p => p.tipoPedido).filter(Boolean).sort()

    return NextResponse.json({
      agentes,
      pdvs,
      tiposSolicitud,
      tiposPedido
    })

  } catch (error: any) {
    console.error("Error cargando filtros:", error)
    return NextResponse.json({ error: "Error al cargar filtros dinámicos" }, { status: 500 })
  }
}
