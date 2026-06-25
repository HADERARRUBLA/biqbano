import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// DELETE /api/admin/users/[userId] — Elimina un usuario del tenant
export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { userId } = params

  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propio usuario" },
      { status: 400 }
    )
  }

  try {
    // Verificar que el usuario a eliminar pertenezca al mismo tenant
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true }
    })

    if (!userToDelete || userToDelete.tenantId !== session.user.tenantId) {
      return NextResponse.json(
        { error: "Usuario no encontrado en este tenant" },
        { status: 404 }
      )
    }

    // Eliminar el usuario
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error eliminando usuario:", error)
    return NextResponse.json(
      { error: "Error al eliminar usuario", details: error.message },
      { status: 500 }
    )
  }
}
