import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/admin/users/[userId]/filter-config
// Obtiene el filterConfig del dashboard asignado al usuario
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { userId } = params

    // Encontrar el dashboard asignado al usuario (viewer)
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        tenantId: session.user.tenantId,
        assignedTo: userId,
      },
    })

    if (!dashboard) {
      // Si no tiene dashboard asignado, retornar config por defecto o vacía
      return NextResponse.json({ filterConfig: {} })
    }

    return NextResponse.json({ filterConfig: dashboard.filterConfig })
  } catch (error: any) {
    console.error("Error obteniendo filter config:", error)
    return NextResponse.json(
      { error: "Error interno", details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/admin/users/[userId]/filter-config
// Actualiza el filterConfig del dashboard asignado al usuario
export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { userId } = params
    const body = await req.json()
    const { filterConfig } = body

    // Encontrar el dashboard asignado al usuario
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        tenantId: session.user.tenantId,
        assignedTo: userId,
      },
    })

    if (!dashboard) {
      return NextResponse.json(
        { error: "El usuario no tiene un dashboard asignado" },
        { status: 400 }
      )
    }

    // Actualizar config
    await prisma.dashboard.update({
      where: { id: dashboard.id },
      data: {
        filterConfig: filterConfig || {},
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error actualizando filter config:", error)
    return NextResponse.json(
      { error: "Error interno", details: error.message },
      { status: 500 }
    )
  }
}
