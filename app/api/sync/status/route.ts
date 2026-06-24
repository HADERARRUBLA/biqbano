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

    const dataSource = await prisma.dataSource.findFirst({
      where: { tenantId }
    })

    const lastLog = await prisma.syncLog.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" }
    })

    const lastCronLog = await prisma.syncLog.findFirst({
      where: { 
        tenantId,
        source: "cron"
      },
      orderBy: { createdAt: "desc" }
    })

    const recentLogs = await prisma.syncLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5
    })

    return NextResponse.json({
      success: true,
      dataSource,
      lastLog,
      lastCronLog,
      recentLogs
    })
  } catch (error: any) {
    console.error("Error in /api/sync/status:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
