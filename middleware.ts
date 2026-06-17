import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export default auth((req: any) => {
  const isLoggedIn = !!req.auth
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login")
  const isDashboardRoute = req.nextUrl.pathname.startsWith("/dashboard")
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(`/dashboard/${req.auth?.user.tenantSlug}/overview`, req.nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn && (isDashboardRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  if (isAdminRoute && req.auth?.user.role !== "admin") {
    return NextResponse.redirect(new URL(`/dashboard/${req.auth?.user.tenantSlug}/overview`, req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
