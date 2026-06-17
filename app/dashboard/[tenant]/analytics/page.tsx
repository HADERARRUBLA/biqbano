import prisma from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Filters from "@/components/dashboard/filters"
import ChartsGrid from "@/components/dashboard/charts-grid"
import { Database, Settings } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage({
  params
}: {
  params: { tenant: string }
}) {
  const tenantSlug = params.tenant

  const tenantRecord = await prisma.tenant.findUnique({
    where: { slug: tenantSlug }
  })

  if (!tenantRecord) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Card className="max-w-md w-full text-center shadow-sm">
          <CardHeader>
            <CardTitle>Tenant no encontrado</CardTitle>
            <CardDescription>
              El tenant especificado en la URL no existe en el sistema.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const count = await prisma.orderRecord.count({
    where: { tenantId: tenantRecord.id }
  })

  if (count === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md w-full text-center shadow-sm border border-dashed p-6">
          <CardHeader className="flex flex-col items-center justify-center">
            <div className="p-3 bg-gray-50 rounded-full mb-2 border">
              <Database className="h-8 w-8 text-gray-400" />
            </div>
            <CardTitle className="text-xl">Sin datos sincronizados</CardTitle>
            <CardDescription className="text-sm">
              Para ver las analíticas, primero debes conectar tu origen de datos en Google Sheets.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href={`/admin/${tenantSlug}/settings`}>
              <Button className="w-full">
                <Settings className="mr-2 h-4 w-4" /> Configurar Origen de Datos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Filters />
      <ChartsGrid height={400} />
    </div>
  )
}
