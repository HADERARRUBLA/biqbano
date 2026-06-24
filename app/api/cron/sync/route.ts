import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verificar que es llamado por Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = []
  
  try {
    // Obtener todos los tenants con datasource configurado
    const dataSources = await prisma.dataSource.findMany({
      include: { tenant: true }
    })

    // Calcular rango: últimos 7 días
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 7)
    
    const fromStr = from.toISOString().split('T')[0]
    const toStr = to.toISOString().split('T')[0]

    for (const ds of dataSources) {
      try {
        // Llamar a la lógica de sync existente
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const response = await fetch(`${baseUrl}/api/sync/sheets`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-cron-secret': process.env.CRON_SECRET || ''
          },
          body: JSON.stringify({
            tenantId: ds.tenantId,
            from: fromStr,
            to: toStr,
            cronMode: true
          })
        })
        
        const result = await response.json()
        results.push({
          tenant: ds.tenant.slug,
          success: response.ok,
          rowsSynced: result.rowsSynced || 0,
          error: result.error || null
        })
      } catch (error: any) {
        results.push({
          tenant: ds.tenant.slug,
          success: false,
          error: error.message
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      syncedAt: new Date().toISOString(),
      results 
    })

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
