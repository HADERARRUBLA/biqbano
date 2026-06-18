"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MonthPickerProps {
  value: string // "YYYY-MM"
  onChange: (month: string) => void
  className?: string
}

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

export default function MonthPicker({ value, onChange, className = "" }: MonthPickerProps) {
  const [year, month] = value.split("-").map(Number)

  const prev = () => {
    const d = new Date(year, month - 2)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const next = () => {
    const d = new Date(year, month)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const label = `${MONTH_NAMES[month - 1]} ${year}`

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={prev}
        title="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs font-semibold text-gray-700 min-w-[72px] text-center select-none">
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={next}
        title="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
