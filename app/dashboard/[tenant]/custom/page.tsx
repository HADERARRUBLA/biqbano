"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Pencil, Save, X, Plus, LayoutDashboard, Loader2, Trash2 } from "lucide-react"
import dynamicImport from "next/dynamic"
import WidgetCatalog from "@/components/dashboard/widget-catalog"
import Filters from "@/components/dashboard/filters"
import type { WidgetItem } from "@/components/dashboard/draggable-grid"

export const dynamic = 'force-dynamic'

const DraggableGrid = dynamicImport(
  () => import("@/components/dashboard/draggable-grid"),
  { ssr: false }
)

interface Dashboard {
  id: string
  name: string
  isDefault: boolean
  widgets: WidgetItem[]
}

export default function CustomDashboardPage() {
  const params = useParams()
  const tenant = params.tenant as string

  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [activeDashboard, setActiveDashboard] = useState<Dashboard | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [localWidgets, setLocalWidgets] = useState<WidgetItem[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [userRole, setUserRole] = useState<string>("viewer")

  // Dialog para nuevo dashboard
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  // ── Cargar dashboards ───────────────────────────────────────────────────
  const loadDashboards = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Obtener la sesión/rol
      const sessionRes = await fetch("/api/auth/session")
      const session = await sessionRes.json()
      const role = session?.user?.role || "viewer"
      setUserRole(role)

      // 2. Obtener los dashboards
      const res = await fetch("/api/dashboard/custom")
      if (!res.ok) return
      const data: Dashboard[] = await res.json()
      setDashboards(data)

      if (data.length > 0) {
        const def = data.find((d) => d.isDefault) || data[0]
        setActiveDashboard(def)
        setLocalWidgets(def.widgets)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboards()
  }, [loadDashboards])

  // ── Crear nuevo dashboard ────────────────────────────────────────────────
  const handleCreate = async () => {
    if (userRole === "viewer") return
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/dashboard/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), withDefaults: false }),
      })
      if (res.ok) {
        const created: Dashboard = await res.json()
        setDashboards((prev) => [...prev, created])
        setActiveDashboard(created)
        setLocalWidgets([])
        setShowNewDialog(false)
        setNewName("")
        setEditMode(true)  // entrar a modo edición automáticamente
      }
    } finally {
      setCreating(false)
    }
  }

  // ── Cambiar dashboard activo ─────────────────────────────────────────────
  const handleSelectDashboard = (id: string) => {
    const found = dashboards.find((d) => d.id === id)
    if (found) {
      setActiveDashboard(found)
      setLocalWidgets(found.widgets)
      setEditMode(false)
      setDirty(false)
    }
  }

  // ── Agregar widget desde catálogo ────────────────────────────────────────
  const handleAddWidget = (type: string) => {
    if (userRole === "viewer") return
    const newWidget: WidgetItem = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      position: localWidgets.length,
    }
    setLocalWidgets((prev) => [...prev, newWidget])
    setDirty(true)
  }

  // ── Eliminar widget ──────────────────────────────────────────────────────
  const handleRemoveWidget = (id: string) => {
    if (userRole === "viewer") return
    setLocalWidgets((prev) =>
      prev.filter((w) => w.id !== id).map((w, idx) => ({ ...w, position: idx }))
    )
    setDirty(true)
  }

  // ── Reordenar widgets ────────────────────────────────────────────────────
  const handleReorder = (reordered: WidgetItem[]) => {
    if (userRole === "viewer") return
    setLocalWidgets(reordered)
    setDirty(true)
  }

  // ── Guardar layout ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (userRole === "viewer") return
    if (!activeDashboard) return
    setSaving(true)
    try {
      const res = await fetch(`/api/dashboard/custom/${activeDashboard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgets: localWidgets.map((w, idx) => ({
            type: w.type,
            position: idx,
            config: w.config || {},
          })),
        }),
      })
      if (res.ok) {
        const updated: Dashboard = await res.json()
        setDashboards((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
        setActiveDashboard(updated)
        setLocalWidgets(updated.widgets)
        setDirty(false)
        setEditMode(false)
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Descartar cambios ────────────────────────────────────────────────────
  const handleCancel = () => {
    if (activeDashboard) {
      setLocalWidgets(activeDashboard.widgets)
      setDirty(false)
    }
    setEditMode(false)
  }

  // ── Eliminar dashboard ───────────────────────────────────────────────────
  const handleDelete = async () => {
    if (userRole === "viewer") return
    if (!activeDashboard) return
    if (!confirm(`¿Eliminar el dashboard "${activeDashboard.name}"?`)) return
    const res = await fetch(`/api/dashboard/custom/${activeDashboard.id}`, {
      method: "DELETE",
    })
    if (res.ok) {
      await loadDashboards()
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando dashboards...
      </div>
    )
  }

  // ── Sin dashboards ────────────────────────────────────────────────────────
  if (dashboards.length === 0) {
    if (userRole === "viewer") {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="text-6xl">🎨</div>
          <h2 className="text-xl font-semibold text-gray-800">Sin dashboard asignado</h2>
          <p className="text-gray-500 max-w-sm">
            Tu administrador aún no ha configurado tu dashboard. Contacta al administrador de tu empresa.
          </p>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="text-6xl">🎨</div>
        <h2 className="text-xl font-semibold text-gray-800">Crea tu primer dashboard</h2>
        <p className="text-gray-500 max-w-sm">
          Personaliza tu vista seleccionando y ordenando los widgets que más necesitas.
        </p>
        <Button onClick={() => setShowNewDialog(true)} className="mt-2">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Dashboard
        </Button>
        <NewDashboardDialog
          open={showNewDialog}
          name={newName}
          creating={creating}
          onNameChange={setNewName}
          onCreate={handleCreate}
          onClose={() => { setShowNewDialog(false); setNewName("") }}
        />
      </div>
    )
  }

  const activeTypes = localWidgets.map((w) => w.type)
  const isViewer = userRole === "viewer"

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">Mi Dashboard</h1>
          {activeDashboard?.isDefault && (
            <Badge variant="secondary" className="text-xs">Principal</Badge>
          )}
          {dirty && (
            <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">
              Sin guardar
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de dashboard */}
          <Select value={activeDashboard?.id || ""} onValueChange={handleSelectDashboard}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Seleccionar dashboard" />
            </SelectTrigger>
            <SelectContent>
              {dashboards.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">
                  {d.name} {d.isDefault && "⭐"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Opciones de edición y creación — ocultas para el viewer */}
          {!isViewer && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowNewDialog(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Nuevo
              </Button>

              {!editMode ? (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditMode(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                  >
                    {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
                    {saving ? "Guardando..." : "Guardar layout"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleCancel}>
                    <X className="mr-1 h-3.5 w-3.5" /> Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <Filters />

      {/* ── Main ── */}
      <div className="flex flex-1 gap-0 min-h-0">
        {/* Grid de widgets */}
        <div className={`flex-1 overflow-auto pr-3 ${editMode ? "pb-4" : ""}`}>
          {editMode && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-2">
              <GripIcon />
              Modo edición activo — arrastra los widgets para reordenar, haz clic en ✕ para eliminar,
              o añade nuevos desde el catálogo →
            </div>
          )}
          <DraggableGrid
            widgets={localWidgets}
            editMode={editMode}
            onReorder={handleReorder}
            onRemove={handleRemoveWidget}
          />
        </div>

        {/* Catálogo (solo en modo edición) */}
        {editMode && !isViewer && (
          <WidgetCatalog activeTypes={activeTypes} onAdd={handleAddWidget} />
        )}
      </div>

      {/* Dialog nuevo dashboard */}
      <NewDashboardDialog
        open={showNewDialog}
        name={newName}
        creating={creating}
        onNameChange={setNewName}
        onCreate={handleCreate}
        onClose={() => { setShowNewDialog(false); setNewName("") }}
      />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function GripIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function NewDashboardDialog({
  open, name, creating, onNameChange, onCreate, onClose,
}: {
  open: boolean
  name: string
  creating: boolean
  onNameChange: (v: string) => void
  onCreate: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo Dashboard</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder="Nombre del dashboard"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCreate()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={creating}>Cancelar</Button>
          <Button onClick={onCreate} disabled={creating || !name.trim()}>
            {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            {creating ? "Creando..." : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
