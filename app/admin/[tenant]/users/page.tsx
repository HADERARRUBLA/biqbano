"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Shield, User as UserIcon, Loader2, CheckCircle, HelpCircle, Save, Trash2, Plus, Settings } from "lucide-react"

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
  const [myId, setMyId] = useState<string | null>(null)
  
  // Track selected dashboardId per viewer locally before saving
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  // Modal / Nuevo usuario State
  const [isOpen, setIsOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState("viewer")
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Modal Filtros
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [selectedFilterUser, setSelectedFilterUser] = useState<User | null>(null)
  const [filterConfig, setFilterConfig] = useState<Record<string, boolean>>({})
  const [savingFilters, setSavingFilters] = useState(false)

  // ── Cargar Datos ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Cargar id propio
      const meRes = await fetch("/api/admin/users/me")
      if (meRes.ok) {
        const meData = await meRes.json()
        setMyId(meData.id)
      }

      // 2. Cargar usuarios
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

      // 3. Cargar dashboards creados por el admin
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

  // ── Crear usuario ────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Error al crear usuario")
      }

      setFormSuccess("Usuario creado exitosamente")
      
      // Resetear campos
      setNewName("")
      setNewEmail("")
      setNewPassword("")
      setNewRole("viewer")
      
      // Esperar brevemente, cerrar y recargar
      setTimeout(() => {
        setIsOpen(false)
        setFormSuccess(null)
        loadData()
      }, 1500)

    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // ── Eliminar usuario ──────────────────────────────────────────────────────
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`¿Eliminar a ${userName}? Esta acción no se puede deshacer`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        alert("✅ Usuario eliminado exitosamente.")
        loadData()
      } else {
        const data = await res.json()
        alert(`❌ Error al eliminar: ${data.error || "Error desconocido"}`)
      }
    } catch (err) {
      console.error(err)
      alert("❌ Error de red al intentar eliminar.")
    }
  }

  // ── Configurar Filtros ───────────────────────────────────────────────────
  const handleOpenFilterModal = async (user: User) => {
    setSelectedFilterUser(user)
    setFilterConfig({
      desde: true, hasta: true, agente: true, pdv: true,
      tipoSolicitud: true, tipoPedido: true, turno: true
    })
    
    // Podríamos cargar la configuración actual desde el usuario si viniera en la API,
    // por ahora usaremos default true o lo podemos cargar de la API al abrir.
    try {
      const res = await fetch(`/api/admin/users/${user.id}/filter-config`)
      if (res.ok) {
        const data = await res.json()
        if (data.filterConfig) {
          setFilterConfig(data.filterConfig)
        }
      }
    } catch (e) {}

    setFilterModalOpen(true)
  }

  const handleSaveFilters = async () => {
    if (!selectedFilterUser) return
    setSavingFilters(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedFilterUser.id}/filter-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filterConfig }),
      })
      if (res.ok) {
        setFilterModalOpen(false)
        alert("✅ Configuración de filtros guardada.")
      } else {
        const data = await res.json()
        alert(`❌ Error: ${data.error}`)
      }
    } catch (err) {
      console.error(err)
      alert("❌ Error al guardar filtros.")
    } finally {
      setSavingFilters(false)
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">👥 Gestión de Usuarios y Roles</h1>
            <p className="text-xs text-gray-500">Administra accesos y asigna dashboards personalizados a espectadores.</p>
          </div>
        </div>
        <Button onClick={() => setIsOpen(true)} className="flex items-center gap-1">
          <Plus className="h-4 w-4" /> Nuevo Usuario
        </Button>
      </div>

      {/* Modal Crear Usuario */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Completa los datos del nuevo usuario para registrarlo en el sistema.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-4">
            {formError && (
              <div className="p-3 text-xs bg-red-50 text-red-600 rounded border border-red-200">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 text-xs bg-green-50 text-green-600 rounded border border-green-200">
                {formSuccess}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="newName">Nombre completo</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                disabled={creating}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newEmail">Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                disabled={creating}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newPassword">Contraseña temporal</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={creating}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newRole">Rol</Label>
              <Select value={newRole} onValueChange={setNewRole} disabled={creating}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Espectador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Configurar Filtros */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurar filtros para {selectedFilterUser?.name}</DialogTitle>
            <DialogDescription>
              Selecciona qué filtros estarán visibles en el dashboard de este usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {[
              { id: "desde", label: "Fecha Desde" },
              { id: "hasta", label: "Fecha Hasta" },
              { id: "agente", label: "Agente" },
              { id: "pdv", label: "PDV" },
              { id: "tipoSolicitud", label: "Tipo de Solicitud" },
              { id: "tipoPedido", label: "Tipo de Pedido" },
              { id: "turno", label: "Turno" },
            ].map((f) => (
              <div key={f.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`filter-${f.id}`}
                  checked={filterConfig[f.id] ?? true}
                  onCheckedChange={(checked: boolean | "indeterminate") => 
                    setFilterConfig(prev => ({ ...prev, [f.id]: !!checked }))
                  }
                />
                <label
                  htmlFor={`filter-${f.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {f.label}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setFilterModalOpen(false)} disabled={savingFilters}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFilters} disabled={savingFilters}>
              {savingFilters ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        <div className="flex items-center justify-end gap-2">
                          {isViewer && hasAssigned && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-gray-600 border-gray-300"
                              onClick={() => handleOpenFilterModal(user)}
                            >
                              <Settings className="h-3 w-3 mr-1" /> Filtros
                            </Button>
                          )}
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
                          {myId !== user.id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteUser(user.id, user.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
