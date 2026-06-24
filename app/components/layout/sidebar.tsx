import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, BarChart2, ShoppingBag, PenSquare, Users, Settings } from "lucide-react"

export default function Sidebar({ tenantSlug, role }: { tenantSlug: string; role?: string }) {
  const navItems = [
    { href: `/dashboard/${tenantSlug}/overview`,  label: "Overview",       icon: LayoutDashboard },
    { href: `/dashboard/${tenantSlug}/orders`,    label: "Pedidos",         icon: ShoppingBag },
    { href: `/dashboard/${tenantSlug}/analytics`, label: "Analíticas",      icon: BarChart2 },
    { href: `/dashboard/${tenantSlug}/custom`,    label: "Mi Dashboard",    icon: PenSquare, badge: "Nuevo" },
  ]

  return (
    <div className="flex h-full max-h-screen flex-col gap-2 border-r bg-gray-100/40 dark:bg-gray-800/40">
      <div className="flex h-14 items-center border-b px-6">
        <Link className="flex items-center gap-2 font-semibold" href={`/dashboard/${tenantSlug}/overview`}>
          <span className="text-blue-600 font-bold tracking-tight">biqbano</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium gap-1">
          {navItems.map(({ href, label, icon: Icon, badge }) => (
            <Link
              key={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 transition-all dark:text-gray-400 dark:hover:text-gray-50"
              href={href}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200">
                  {badge}
                </Badge>
              )}
            </Link>
          ))}

          {role === "admin" && (
            <>
              <div className="mt-4 mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Administración
              </div>
              <Link
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 transition-all dark:text-gray-400 dark:hover:text-gray-50"
                href={`/admin/${tenantSlug}/settings`}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">Configuración</span>
              </Link>
              <Link
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 transition-all dark:text-gray-400 dark:hover:text-gray-50"
                href={`/admin/${tenantSlug}/users`}
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">Usuarios</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  )
}
