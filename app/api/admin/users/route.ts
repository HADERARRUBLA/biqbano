import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

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

// POST /api/admin/users — Crea un nuevo usuario para el tenant actual del admin
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { name, email, password, role } = await req.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    if (role !== "admin" && role !== "viewer") {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "El correo electrónico ya está registrado" }, { status: 400 })
    }

    // Hashear contraseña con bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear el usuario asignándole el tenantId del administrador
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        tenantId: session.user.tenantId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error("Error creando usuario:", error)
    return NextResponse.json(
      { error: "Error al crear usuario", details: error.message },
      { status: 500 }
    )
  }
}
