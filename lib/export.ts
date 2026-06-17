/**
 * Utilidades de exportación: Excel (.xlsx) y PDF
 * Requiere: xlsx, jspdf, jspdf-autotable
 */

// ── Excel Export ──────────────────────────────────────────────────────────────
export async function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = "Datos"
): Promise<void> {
  const XLSX = await import("xlsx")

  if (!data || data.length === 0) return

  // Construir filas planas desde baseData
  const rows = data.map((rec: any) => {
    const b = rec.baseData || rec
    return {
      Fecha: b.fecha || "",
      Día: b.dia || "",
      Agente: b.agente || "",
      Usuario: b.usuario || "",
      Turno: b.turno || "",
      "Antes de las 12": b.antesDeLas12 || "",
      Hora: b.hora || "",
      Celular: b.celular || "",
      "Tipo de Solicitud": b.tipoSolicitud || "",
      PDV: b.pdv || "",
      Total: b.total ? Number(String(b.total).replace(/[$,.]/g, "")) : 0,
      "Tipo de Pedido": b.tipoPedido || "",
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-width de columnas
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r: any) => String(r[key] || "").length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws["!cols"] = colWidths

  // Estilo del header (bold + background) — xlsx ce no soporta estilos sin xlsx-style,
  // pero sí podemos hacer freeze y auto-filter
  ws["!autofilter"] = { ref: ws["!ref"] || "A1" }
  ws["!freeze"] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ── PDF Export ────────────────────────────────────────────────────────────────
export async function exportToPDF(
  data: any[],
  filename: string,
  title: string,
  filters: Record<string, string> = {}
): Promise<void> {
  const { default: jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  if (!data || data.length === 0) return

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  const pageW = doc.internal.pageSize.getWidth()
  const now = new Date().toLocaleString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  })

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(30, 64, 175)  // blue-800
  doc.rect(0, 0, pageW, 18, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("BIQBANO", 10, 11)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(title, pageW / 2, 11, { align: "center" })
  doc.text(`Generado: ${now}`, pageW - 10, 11, { align: "right" })

  // ── Filtros aplicados ─────────────────────────────────────────────────────
  let cursorY = 24
  const activeFilters = Object.entries(filters).filter(([, v]) => v && v !== "")
  if (activeFilters.length > 0) {
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text("Filtros aplicados:", 10, cursorY)
    doc.setFont("helvetica", "normal")
    const filterText = activeFilters.map(([k, v]) => `${k}: ${v}`).join("  |  ")
    doc.text(filterText, 40, cursorY)
    cursorY += 6
  }

  // ── Tabla ─────────────────────────────────────────────────────────────────
  const headers = [
    "Fecha", "Agente", "Turno", "Antes 12", "PDV",
    "Tipo Solicitud", "Tipo Pedido", "Total"
  ]

  const rows = data.map((rec: any) => {
    const b = rec.baseData || rec
    const total = b.total ? Number(String(b.total).replace(/[$,.]/g, "")) : 0
    return [
      b.fecha || "",
      b.agente || "",
      b.turno || "",
      b.antesDeLas12 || "",
      b.pdv || "",
      b.tipoSolicitud || "",
      b.tipoPedido || "",
      total > 0 ? `$${new Intl.NumberFormat("es-CO").format(total)}` : "",
    ]
  })

  autoTable(doc, {
    startY: cursorY,
    head: [headers],
    body: rows,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      7: { halign: "right" },  // Total
    },
    didDrawPage: (hookData: any) => {
      // Footer con número de página
      const pageCount = (doc as any).internal.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Página ${hookData.pageNumber} de ${pageCount}  |  Total registros: ${data.length}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" }
      )
    },
  })

  doc.save(`${filename}.pdf`)
}
