import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

const DEFAULT_WIDGETS = [
  { type: "kpi_total_ventas",    position: 0 },
  { type: "kpi_total_pedidos",   position: 1 },
  { type: "kpi_ticket_promedio", position: 2 },
  { type: "kpi_top_agente",      position: 3 },
  { type: "kpi_top_pdv",         position: 4 },
  { type: "kpi_cumplimiento",    position: 5 },
  { type: "chart_ventas_dia",    position: 6 },
  { type: "chart_por_agente",    position: 7 },
  { type: "chart_por_tipo",      position: 8 },
  { type: "chart_por_turno",     position: 9 },
  { type: "chart_top_pdv",       position: 10 },
]

// GET /api/dashboard/custom — lista dashboards del usuario según rol
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const whereClause: any = {
    tenantId: session.user.tenantId,
  }

  if (session.user.role === "admin") {
    whereClause.userId = session.user.id
  } else {
    whereClause.assignedTo = session.user.id
  }

  const dashboards = await prisma.dashboard.findMany({
    where: whereClause,
    include: { widgets: { orderBy: { position: "asc" } } },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  })

  return NextResponse.json(dashboards)
}

// POST /api/dashboard/custom — crea nuevo dashboard con widgets por defecto
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = body.name || "Mi Dashboard"
  const withDefaults = body.withDefaults !== false

  // Si es el primero, marcarlo como default
  const count = await prisma.dashboard.count({
    where: { tenantId: session.user.tenantId, userId: session.user.id },
  })

  const dashboard = await prisma.dashboard.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      name,
      isDefault: count === 0,
      widgets: withDefaults
        ? { create: DEFAULT_WIDGETS.map(w => ({ ...w, config: {} })) }
        : undefined,
    },
    include: { widgets: { orderBy: { position: "asc" } } },
  })

  return NextResponse.json(dashboard, { status: 201 })
}
