import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export default auth((req: any) => {
  const isLoggedIn = !!req.auth
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login")
  const isDashboardRoute = req.nextUrl.pathname.startsWith("/dashboard")
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")

  if (isAuthRoute) {
    if (isLoggedIn) {
      const defaultPage = req.auth?.user.role === "admin" ? "overview" : "custom"
      return NextResponse.redirect(new URL(`/dashboard/${req.auth?.user.tenantSlug}/${defaultPage}`, req.nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn && (isDashboardRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  if (isLoggedIn && req.auth?.user.role !== "admin") {
    // Proteger rutas de administración
    if (isAdminRoute) {
      return NextResponse.redirect(new URL(`/dashboard/${req.auth?.user.tenantSlug}/custom`, req.nextUrl))
    }
    
    // Proteger vistas específicas de dashboard para viewers
    const path = req.nextUrl.pathname
    const tenantSlug = req.auth?.user.tenantSlug
    if (
      path.startsWith(`/dashboard/${tenantSlug}/overview`) ||
      path.startsWith(`/dashboard/${tenantSlug}/orders`) ||
      path.startsWith(`/dashboard/${tenantSlug}/analytics`)
    ) {
      return NextResponse.redirect(new URL(`/dashboard/${tenantSlug}/custom`, req.nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
