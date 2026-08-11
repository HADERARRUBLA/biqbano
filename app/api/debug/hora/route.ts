import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

function parseHora(horaStr: string | null | undefined): number | null {
  if (!horaStr) return null
  
  let str = horaStr.toLowerCase().trim()
  str = str.replace(/:\s*(a\.m\.|p\.m\.|am|pm)/g, ' $1')
  str = str.replace(/:\s+/g, ' ').trim()
  
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const hour = parseInt(str.split(':')[0])
    return hour >= 0 && hour <= 23 ? hour : null
  }
  
  const isPM = str.includes('p.m') || str.includes('pm')
  const isAM = str.includes('a.m') || str.includes('am')
  
  const match = str.match(/(\d{1,2})/)
  if (!match) return null
  
  let hour = parseInt(match[1])
  
  if (isPM && hour !== 12) hour += 12
  else if (isAM && hour === 12) hour = 0
  
  return hour >= 0 && hour <= 23 ? hour : null
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    const records = await prisma.orderRecord.findMany({
      where: { tenantId },
      orderBy: { fecha: 'desc' },
      take: 10,
    })

    const result = records.map(r => {
      const baseData = r.baseData as Record<string, any>
      const horaRaw =
        baseData?.["Hora"] ??
        baseData?.["hora"] ??
        baseData?.["HORA"] ??
        baseData?.["hora_solicitud"] ??
        null

      const horaParsed = parseHora(horaRaw)
      return {
        id: r.id,
        identificador: {
          fecha: r.fecha,
          agente: r.agente,
          pdv: r.pdv
        },
        horaRaw,
        horaParsed,
        baseData
      }
    })

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
