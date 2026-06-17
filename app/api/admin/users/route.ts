import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/admin/users — Retorna usuarios del tenant con sus dashboards asignados
export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    // 1. Obtener todos los usuarios del tenant
    const users = await prisma.user.findMany({
      where: { tenantId: session.user.tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    })

    // 2. Obtener todos los dashboards del tenant
    const dashboards = await prisma.dashboard.findMany({
      where: { tenantId: session.user.tenantId },
      select: {
        id: true,
        name: true,
        assignedTo: true,
      },
    })

    // 3. Mapear dashboards asignados a cada usuario
    const usersWithDashboards = users.map((user) => {
      const assignedDashboard = dashboards.find((d) => d.assignedTo === user.id)
      return {
        ...user,
        assignedDashboard: assignedDashboard
          ? { id: assignedDashboard.id, name: assignedDashboard.name }
          : null,
      }
    })

    return NextResponse.json(usersWithDashboards)
  } catch (error: any) {
    console.error("Error obteniendo usuarios:", error)
    return NextResponse.json(
      { error: "Error al obtener usuarios", details: error.message },
      { status: 500 }
    )
  }
}
