import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const tenant = await prisma.tenant.findUnique({ 
    where: { slug: 'demo' } 
  })
  if (!tenant) throw new Error('Tenant no encontrado')
  
  const updated = await prisma.dataSource.updateMany({
    where: { tenantId: tenant.id },
    data: { tabName: 'Libro General de Ventas' }
  })
  console.log(`✅ Tab actualizado a: Libro General de Ventas (${updated.count} registro/s)`)
}

main().finally(() => prisma.$disconnect())
