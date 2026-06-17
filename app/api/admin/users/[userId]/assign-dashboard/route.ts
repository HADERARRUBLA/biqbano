import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// PUT /api/admin/users/[userId]/assign-dashboard
export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { userId } = params
  const body = await req.json().catch(() => ({}))
  const { dashboardId } = body // string | null

  try {
    // 1. Primero, quitar cualquier asignación actual para este usuario en este tenant
    await prisma.dashboard.updateMany({
      where: {
        tenantId: session.user.tenantId,
        assignedTo: userId,
      },
      data: {
        assignedTo: null,
      },
    })

    // 2. Si se proporcionó un dashboardId, asignarlo
    if (dashboardId) {
      // Validar que el dashboard pertenece al tenant
      const dbExists = await prisma.dashboard.findFirst({
        where: {
          id: dashboardId,
          tenantId: session.user.tenantId,
        },
      })

      if (!dbExists) {
        return NextResponse.json(
          { error: "El dashboard especificado no existe o no pertenece a tu empresa" },
          { status: 404 }
        )
      }

      // Asignar dashboard
      await prisma.dashboard.update({
        where: { id: dashboardId },
        data: { assignedTo: userId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error al asignar dashboard:", error)
    return NextResponse.json(
      { error: "Error al asignar dashboard", details: error.message },
      { status: 500 }
    )
  }
}
