import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || '2026-03'
  
  const [year, mon] = month.split('-')
  const desde = new Date(parseInt(year), parseInt(mon)-1, 1)
  const hasta = new Date(parseInt(year), parseInt(mon), 0)
  
  const registros = await prisma.orderRecord.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    select: { baseData: true },
    take: 1000
  })
  
  // Contar por hora raw exacta
  const horaCount: Record<string, number> = {}
  for (const r of registros) {
    const baseData = r.baseData as Record<string, any>
    // Se agregan las llaves históricas para garantizar que no regrese todo como NULL
    const hora = baseData?.["Hora"] ?? baseData?.["hora"] ?? baseData?.["HORA"] ?? baseData?.["hora_solicitud"] ?? 'NULL'
    horaCount[hora] = (horaCount[hora] || 0) + 1
  }
  
  // Ordenar por cantidad
  const sorted = Object.entries(horaCount)
    .sort((a, b) => b[1] - a[1])
  
  return NextResponse.json({
    mes: month,
    totalRegistros: registros.length,
    distribucionHoras: sorted
  })
}
