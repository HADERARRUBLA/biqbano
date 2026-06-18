/**
 * Paleta de colores para Tipos de Solicitud (tipoSolicitud)
 * Usada por widgets analíticos avanzados.
 */

export interface TipoColor {
  hex: string
  bg: string       // Tailwind bg
  text: string     // Tailwind text
  border: string   // Tailwind border
}

export const TIPO_COLORS: Record<string, TipoColor> = {
  "Venta": {
    hex: "#22c55e",
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-400",
  },
  "Sin Respuesta": {
    hex: "#f97316",
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-400",
  },
  "Información": {
    hex: "#3b82f6",
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-400",
  },
  "Precio Alto": {
    hex: "#ef4444",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-400",
  },
  "Sin Stock": {
    hex: "#a855f7",
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-400",
  },
  "Otro": {
    hex: "#6b7280",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-400",
  },
  "Cancelado": {
    hex: "#ec4899",
    bg: "bg-pink-100",
    text: "text-pink-700",
    border: "border-pink-400",
  },
  "Pendiente": {
    hex: "#eab308",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-400",
  },
  "Devuelto": {
    hex: "#14b8a6",
    bg: "bg-teal-100",
    text: "text-teal-700",
    border: "border-teal-400",
  },
}

// Paleta de fallback para tipos desconocidos (cycle through)
const FALLBACK_PALETTE: string[] = [
  "#6366f1", "#0ea5e9", "#d97706", "#be185d",
  "#047857", "#7c3aed", "#b91c1c", "#0369a1",
]

let _fallbackIdx = 0
const _dynamicCache: Record<string, TipoColor> = {}

/**
 * Obtiene el color para un tipo de solicitud.
 * Si no existe en el catálogo, asigna uno de la paleta de fallback de forma consistente.
 */
export function getTipoColor(tipo: string): TipoColor {
  if (TIPO_COLORS[tipo]) return TIPO_COLORS[tipo]
  if (_dynamicCache[tipo]) return _dynamicCache[tipo]

  const hex = FALLBACK_PALETTE[_fallbackIdx % FALLBACK_PALETTE.length]
  _fallbackIdx++
  _dynamicCache[tipo] = { hex, bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-400" }
  return _dynamicCache[tipo]
}

/**
 * Retorna el hex de un tipo, garantizando un color.
 */
export function getTipoHex(tipo: string): string {
  return getTipoColor(tipo).hex
}
