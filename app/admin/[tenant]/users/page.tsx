"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Shield, User as UserIcon, Loader2, CheckCircle, HelpCircle, Save } from "lucide-react"

export const dynamic = 'force-dynamic'

interface DashboardOption {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  assignedDashboard: DashboardOption | null
}

export default function UsersAdminPage() {
  const params = useParams()
  const tenant = params.tenant as string

  const [users, setUsers] = useState<User[]>([])
  const [dashboards, setDashboards] = useState<DashboardOption[]>([])
  const [loading, setLoading] = useState(true)
  
  // Track selected dashboardId per viewer locally before saving
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  // ── Cargar Datos ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Cargar usuarios
      const usersRes = await fetch("/api/admin/users")
      if (!usersRes.ok) throw new Error("Error cargando usuarios")
      const usersData: User[] = await usersRes.json()
      setUsers(usersData)

      // Inicializar mapeo local de asignaciones
      const initialAssignments: Record<string, string> = {}
      usersData.forEach((u) => {
        if (u.assignedDashboard) {
          initialAssignments[u.id] = u.assignedDashboard.id
        } else {
          initialAssignments[u.id] = "none"
        }
      })
      setAssignments(initialAssignments)

      // 2. Cargar dashboards creados por el admin
      const dbRes = await fetch("/api/dashboard/custom")
      if (dbRes.ok) {
        const dbData: DashboardOption[] = await dbRes.json()
        setDashboards(dbData)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Guardar Asignación ───────────────────────────────────────────────────
  const handleSaveAssignment = async (userId: string) => {
    const selectedDashboardId = assignments[userId]
    const dashboardId = selectedDashboardId === "none" ? null : selectedDashboardId

    setSavingUserId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/assign-dashboard`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardId }),
      })
      
      if (res.ok) {
        // Actualizar el estado de usuarios localmente
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            if (u.id === userId) {
              const matchedDb = dashboards.find((d) => d.id === dashboardId)
              return {
                ...u,
                assignedDashboard: matchedDb ? { id: matchedDb.id, name: matchedDb.name } : null,
              }
            }
            return u
          })
        )
        alert("✅ Asignación de dashboard guardada correctamente.")
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(`❌ Error al guardar: ${errData.error || "Error desconocido"}`)
      }
    } catch (err) {
      console.error(err)
      alert("❌ Error de red al intentar guardar.")
    } finally {
      setSavingUserId(null)
    }
  }

  const handleSelectChange = (userId: string, value: string) => {
    setAssignments((prev) => ({
      ...prev,
      [userId]: value,
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando usuarios y tableros...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">👥 Gestión de Usuarios y Roles</h1>
          <p className="text-xs text-gray-500">Administra accesos y asigna dashboards personalizados a espectadores.</p>
        </div>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-800">Usuarios en la empresa</CardTitle>
          <CardDescription className="text-xs">
            Asigna dashboards específicos creados por ti a los usuarios con rol de espectador (Viewer).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-150 bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Usuario</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Rol</th>
                  <th className="py-2.5 px-4">Dashboard Asignado</th>
                  <th className="py-2.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const isViewer = user.role === "viewer"
                  const hasAssigned = !!user.assignedDashboard
                  const currentSelected = assignments[user.id] || "none"
                  const hasPendingChanges = 
                    (user.assignedDashboard?.id || "none") !== currentSelected

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-950 flex items-center gap-2">
                        {user.role === "admin" ? (
                          <Shield className="h-3.5 w-3.5 text-blue-600" />
                        ) : (
                          <UserIcon className="h-3.5 w-3.5 text-gray-500" />
                        )}
                        {user.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{user.email}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="secondary"
                          className={
                            user.role === "admin"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {user.role === "admin" ? "Administrador" : "Espectador"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {isViewer ? (
                          <div className="flex items-center gap-3">
                            <Select
                              value={currentSelected}
                              onValueChange={(val) => handleSelectChange(user.id, val)}
                            >
                              <SelectTrigger className="w-48 h-8 text-xs">
                                <SelectValue placeholder="Sin dashboard asignado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-xs">
                                  ❌ Ninguno (Sin asignar)
                                </SelectItem>
                                {dashboards.map((db) => (
                                  <SelectItem key={db.id} value={db.id} className="text-xs">
                                    📊 {db.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {hasAssigned ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Asignado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 flex items-center gap-1">
                                <HelpCircle className="h-3 w-3" /> Sin asignar
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No aplica (Admin)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isViewer && (
                          <Button
                            size="sm"
                            className="h-8 text-xs font-semibold"
                            onClick={() => handleSaveAssignment(user.id)}
                            disabled={savingUserId === user.id || !hasPendingChanges}
                            variant={hasPendingChanges ? "default" : "secondary"}
                          >
                            {savingUserId === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            Guardar
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
