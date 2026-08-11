import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || '2026-03'
  
  const [year, mon] = month.split('-')
  const desde = new Date(parseInt(year), parseInt(mon)-1, 1)
  const hasta = new Date(parseInt(year), parseInt(mon), 0)
  
  // Buscar registros con hora de madrugada (01:00 a 10:00)
  const registros = await prisma.orderRecord.findMany({
    where: {
      fecha: { gte: desde, lte: hasta }
    },
    select: { baseData: true },
    take: 500
  })
  
  // Filtrar los que tienen hora de madrugada
  const madrugada = registros.filter((r: any) => {
    const hora = (r.baseData as any)?.hora
    if (!hora) return false
    const h = parseInt(hora.split(':')[0])
    return h >= 1 && h <= 10
  })
  
  return NextResponse.json({
    mes: month,
    totalMadrugada: madrugada.length,
    muestra: madrugada.slice(0, 20).map((r: any) => ({
      hora: (r.baseData as any)?.hora,
      tipoSolicitud: (r.baseData as any)?.tipoSolicitud,
      agente: (r.baseData as any)?.agente,
      fecha: (r.baseData as any)?.fecha,
      turno: (r.baseData as any)?.turno
    }))
  })
}
