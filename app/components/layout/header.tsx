import { auth, signOut } from "@/lib/auth"
import { Button } from "@/components/ui/button"

export default async function Header() {
  const session = await auth()

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40 justify-between">
      <div className="font-semibold text-lg">
        {session?.user?.tenantSlug === "demo" ? "Empresa Demo" : session?.user?.tenantSlug}
      </div>
      <form action={async () => {
        "use server"
        await signOut({ redirectTo: "/login" })
      }}>
        <Button variant="outline" size="sm">
          Logout
        </Button>
      </form>
    </header>
  )
}
