import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/dashboard/custom/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const dashboard = await prisma.dashboard.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, userId: session.user.id },
    include: { widgets: { orderBy: { position: "asc" } } },
  })

  if (!dashboard) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(dashboard)
}

// PUT /api/dashboard/custom/[id] — actualiza nombre y/o widgets con su orden
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()

  // Verificar propiedad
  const existing = await prisma.dashboard.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  // Actualizar en transacción: borrar widgets viejos e insertar nuevos en orden
  await prisma.$transaction(async (tx) => {
    if (body.name !== undefined) {
      await tx.dashboard.update({
        where: { id: params.id },
        data: { name: body.name },
      })
    }

    if (Array.isArray(body.widgets)) {
      await tx.widget.deleteMany({ where: { dashboardId: params.id } })
      if (body.widgets.length > 0) {
        await tx.widget.createMany({
          data: body.widgets.map((w: any, idx: number) => ({
            dashboardId: params.id,
            type: w.type,
            position: w.position ?? idx,
            config: w.config || {},
          })),
        })
      }
    }
  })

  const updated = await prisma.dashboard.findUnique({
    where: { id: params.id },
    include: { widgets: { orderBy: { position: "asc" } } },
  })

  return NextResponse.json(updated)
}

// DELETE /api/dashboard/custom/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const existing = await prisma.dashboard.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  await prisma.dashboard.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
