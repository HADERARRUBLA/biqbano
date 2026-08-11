import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Tomar 5 registros de cada mes para comparar
  const meses = ['2026-01', '2026-02', '2026-03', 
                  '2026-04', '2026-05', '2026-06',
                  '2026-07', '2026-08']
  
  const resultado: any = {}
  
  for (const mes of meses) {
    const [year, month] = mes.split('-')
    const desde = new Date(parseInt(year), parseInt(month)-1, 1)
    const hasta = new Date(parseInt(year), parseInt(month), 0)
    
    const registros = await prisma.orderRecord.findMany({
      where: {
        fecha: { gte: desde, lte: hasta }
      },
      take: 5,
      select: { baseData: true }
    })
    
    resultado[mes] = registros.map((r: any) => ({
      horaRaw: (r.baseData as any)?.hora,
      agente: (r.baseData as any)?.agente,
      fecha: (r.baseData as any)?.fecha
    }))
  }
  
  return NextResponse.json({ resultado })
}
