import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseHora(horaStr: string | null | undefined): number | null {
  if (!horaStr) return null
  
  // Normalizar: quitar puntos extra, espacios, 
  // convertir a minúsculas
  let str = horaStr.toLowerCase().trim()
  
  // Quitar doble punto antes de am/pm: "12:00: p.m." → "12:00 p.m."
  str = str.replace(/:(\s*)(a\.?m\.?|p\.?m\.?)/gi, ' $2')
  
  // Normalizar am/pm a formato simple
  str = str.replace(/a\.m\.?/g, 'am').replace(/p\.m\.?/g, 'pm')
  
  // Quitar espacios extra
  str = str.replace(/\s+/g, ' ').trim()
  
  // Ahora el formato es: "12:00 pm", "3:00 pm", "7:00 am"
  const isPM = str.includes('pm')
  const isAM = str.includes('am')
  
  const match = str.match(/^(\d{1,2})/)
  if (!match) return null
  
  let hour = parseInt(match[1])
  
  if (isPM && hour !== 12) hour += 12
  else if (isAM && hour === 12) hour = 0
  
  if (hour < 0 || hour > 23) return null
  return hour
}

export async function GET() {
  // Pruebas estáticas requeridas por diagnóstico
  const testCases = [
    "12:00 p.m.", "12:00: p.m.", "3:00 p.m.",
    "4:00: p.m.", "7:00 p.m", "9:00 a.m.", "12:00 a.m."
  ]
  const testResults = testCases.map(tc => ({
    input: tc,
    output: parseHora(tc)
  }))

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
      horaParsed: parseHora((r.baseData as any)?.hora),
      agente: (r.baseData as any)?.agente,
      fecha: (r.baseData as any)?.fecha
    }))
  }
  
  return NextResponse.json({ testResults, resultado })
}
