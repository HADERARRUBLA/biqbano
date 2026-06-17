import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

function extractSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { sheetUrl, tabName } = await req.json()

    if (!sheetUrl) {
      return NextResponse.json({ error: "La URL de Google Sheets es requerida" }, { status: 400 })
    }

    const sheetId = extractSheetId(sheetUrl)
    if (!sheetId) {
      return NextResponse.json({ error: "URL de Google Sheets inválida" }, { status: 400 })
    }

    const tenantId = session.user.tenantId
    const tab = tabName || "Sheet1"

    const existing = await prisma.dataSource.findFirst({
      where: { tenantId }
    })

    let dataSource
    if (existing) {
      dataSource = await prisma.dataSource.update({
        where: { id: existing.id },
        data: {
          sheetUrl,
          sheetId,
          tabName: tab
        }
      })
    } else {
      dataSource = await prisma.dataSource.create({
        data: {
          tenantId,
          sheetUrl,
          sheetId,
          tabName: tab
        }
      })
    }

    return NextResponse.json({ success: true, dataSource })
  } catch (error: any) {
    console.error("Error in /api/admin/datasource:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
