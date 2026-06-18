"use client"

import { BarChart2, CreditCard, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export type ViewMode = "card" | "chart" | "table"

interface ViewToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  className?: string
}

const MODES: { value: ViewMode; icon: React.ReactNode; label: string }[] = [
  { value: "card", icon: <CreditCard className="h-3.5 w-3.5" />, label: "Card" },
  { value: "chart", icon: <BarChart2 className="h-3.5 w-3.5" />, label: "Gráfica" },
  { value: "table", icon: <Table2 className="h-3.5 w-3.5" />, label: "Tabla" },
]

export default function ViewToggle({ value, onChange, className = "" }: ViewToggleProps) {
  return (
    <div className={`flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5 ${className}`}>
      {MODES.map((m) => (
        <Button
          key={m.value}
          variant={value === m.value ? "secondary" : "ghost"}
          size="sm"
          className={`h-6 px-2 text-[10px] gap-1 rounded ${
            value === m.value
              ? "bg-white shadow-sm text-blue-700 font-semibold"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => onChange(m.value)}
          title={m.label}
        >
          {m.icon}
          <span className="hidden sm:inline">{m.label}</span>
        </Button>
      ))}
    </div>
  )
}
