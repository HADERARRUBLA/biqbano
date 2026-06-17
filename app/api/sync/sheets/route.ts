import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { google } from "googleapis"

// ── Parsear fecha DD/MM/YYYY o YYYY-MM-DD ────────────────────────────────────
function parseSheetDate(val: string): Date | null {
  if (!val) return null
  const clean = String(val).trim()
  if (clean.includes("/")) {
    const parts = clean.split("/")
    if (parts.length === 3 && parts[2].length === 4) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
      return isNaN(d.getTime()) ? null : d
    }
  }
  if (clean.includes("-")) {
    const parts = clean.split("-")
    if (parts[0].length === 4) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      return isNaN(d.getTime()) ? null : d
    }
  }
  return null
}

// ── Parsear CSV con soporte a comillas ────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = ""
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// ── Normalizar header para comparación sin tildes/espacios ───────────────────
function normalizeHeader(h: string): string {
  return h.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_]+/g, "")
}

// ── Mapear índices desde array de headers ─────────────────────────────────────
function buildColMap(headers: string[]): Record<string, number> {
  const colMap: Record<string, number> = {}
  headers.forEach((h, idx) => {
    const norm = normalizeHeader(h)
    if (!norm) return
    if (norm === "fecha")                     colMap.fecha = idx
    else if (norm === "dia")                  colMap.dia = idx
    else if (norm === "agente")               colMap.agente = idx
    else if (norm === "usuario")              colMap.usuario = idx
    else if (norm === "turno")                colMap.turno = idx
    else if (norm.includes("antesdelas12"))   colMap.antesDeLas12 = idx
    else if (norm === "hora")                 colMap.hora = idx
    else if (norm === "celular")              colMap.celular = idx
    else if (norm.includes("tipodesolicitud")) colMap.tipoSolicitud = idx
    else if (norm === "pdv")                  colMap.pdv = idx
    else if (norm === "total")                colMap.total = idx
    else if (norm.includes("tipodepedido"))   colMap.tipoPedido = idx
  })
  return colMap
}

// ── Extraer valor de celda de forma segura ────────────────────────────────────
function getVal(row: string[], colMap: Record<string, number>, key: string): string | null {
  const idx = colMap[key]
  if (idx === undefined || idx >= row.length) return null
  const v = String(row[idx] ?? "").trim()
  return v || null
}

// ── Construir registro para insertar ─────────────────────────────────────────
function buildRecord(
  row: string[],
  rowIndex: number,
  colMap: Record<string, number>,
  tenantId: string
) {
  const fechaRaw     = getVal(row, colMap, "fecha")
  const parsedDate   = parseSheetDate(fechaRaw ?? "")
  const agente       = getVal(row, colMap, "agente")
  const pdv          = getVal(row, colMap, "pdv")
  const tipoSolicitud = getVal(row, colMap, "tipoSolicitud")
  const tipoPedido   = getVal(row, colMap, "tipoPedido")
  const turno        = getVal(row, colMap, "turno")

  const totalRaw = getVal(row, colMap, "total")
  let parsedTotal: number | null = null
  if (totalRaw) {
    const cleanNum = totalRaw.replace(/[$,.]/g, "").trim()
    const parsed = parseFloat(cleanNum)
    parsedTotal = !isNaN(parsed) ? parsed : null
  }

  return {
    tenantId,
    rowIndex,
    fecha: parsedDate,
    agente,
    pdv,
    tipoSolicitud,
    tipoPedido,
    turno,
    total: parsedTotal,
    baseData: {
      fecha: fechaRaw,
      dia: getVal(row, colMap, "dia"),
      agente,
      usuario: getVal(row, colMap, "usuario"),
      turno,
      antesDeLas12: getVal(row, colMap, "antesDeLas12"),
      hora: getVal(row, colMap, "hora"),
      celular: getVal(row, colMap, "celular"),
      tipoSolicitud,
      pdv,
      total: totalRaw,
      tipoPedido,
    } as any,
    extraData: {} as any,
    syncedAt: new Date(),
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_SHEETS_API_KEY no está configurada" },
      { status: 500 }
    )
  }

  const dataSource = await prisma.dataSource.findFirst({ where: { tenantId } })
  if (!dataSource) {
    return NextResponse.json(
      { error: "No se ha configurado ninguna fuente de datos" },
      { status: 400 }
    )
  }

  let from = ""
  let to = ""

  try {
    const body = await req.json()
    from = body.from
    to = body.to

    if (!from || !to) {
      return NextResponse.json(
        { error: "Los campos 'from' y 'to' son requeridos" },
        { status: 400 }
      )
    }

    const fromDate = new Date(from + "T00:00:00")
    const toDate   = new Date(to   + "T23:59:59")

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "Formato de fecha inválido. Usar YYYY-MM-DD" },
        { status: 400 }
      )
    }

    // ── PASO 1: Borrar solo el rango a sincronizar ────────────────────────────
    await prisma.orderRecord.deleteMany({
      where: {
        tenantId,
        fecha: { gte: fromDate, lte: toDate },
      },
    })

    // ── PASO 2: Leer Sheet en batches de 900 con FORMATTED_VALUE ─────────────
    // CRÍTICO: usar FORMATTED_VALUE, NO UNFORMATTED_VALUE.
    // Con UNFORMATTED_VALUE las fechas llegan como números seriales (ej: 45928)
    // y el filtro de fecha nunca matchea → 0 filas sincronizadas.
    const tab = dataSource.tabName || "Libro General de Ventas"
    const PAGE_SIZE = 900
    const INSERT_BATCH = 500

    let colMap: Record<string, number> = {}
    let headersRead = false
    let startRow = 1
    let totalRowsSynced = 0
    let hasMore = true
    let batchesSinDatos = 0          // contador de batches consecutivos sin filas en rango
    let ultimaFechaLeida: Date | null = null  // última fecha válida vista en el Sheet
    const MAX_BATCHES_VACIOS = 3     // early stop tras N batches vacíos post-rango

    // Intentar Sheets API primero; fallback a CSV público si falla
    let useApiMode = true
    let allInRange: ReturnType<typeof buildRecord>[] = []

    try {
      const sheets = google.sheets({ version: "v4", auth: apiKey })

      while (hasMore) {
        const endRow = startRow === 1 ? PAGE_SIZE : startRow + PAGE_SIZE - 1
        const range = `${tab}!A${startRow}:M${endRow}`

        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: dataSource.sheetId,
          range,
          valueRenderOption: "FORMATTED_VALUE",  // ← Mantener SIEMPRE como FORMATTED_VALUE
        })

        const values = response.data.values
        if (!values || values.length === 0) { hasMore = false; break }

        const prevInRange = allInRange.length

        if (!headersRead) {
          colMap = buildColMap((values[0] as any[]).map(String))
          if (colMap.fecha === undefined) {
            throw new Error("No se encontró la columna 'Fecha' en el Sheet")
          }
          headersRead = true
          for (let i = 1; i < values.length; i++) {
            const row = (values[i] as any[]).map(String)
            const fechaRaw = getVal(row, colMap, "fecha")
            const d = parseSheetDate(fechaRaw ?? "")
            if (d) ultimaFechaLeida = d  // registrar siempre la última fecha válida
            if (d && d >= fromDate && d <= toDate) {
              allInRange.push(buildRecord(row, startRow + i, colMap, tenantId))
            }
          }
        } else {
          for (let i = 0; i < values.length; i++) {
            const row = (values[i] as any[]).map(String)
            const fechaRaw = getVal(row, colMap, "fecha")
            const d = parseSheetDate(fechaRaw ?? "")
            if (d) ultimaFechaLeida = d  // registrar siempre la última fecha válida
            if (d && d >= fromDate && d <= toDate) {
              allInRange.push(buildRecord(row, startRow + i, colMap, tenantId))
            }
          }
        }

        const filasEnRango = allInRange.length - prevInRange

        // ── Early stop: 3 batches consecutivos sin datos + fecha ya superada ──
        if (filasEnRango === 0) {
          batchesSinDatos++
          if (
            batchesSinDatos >= MAX_BATCHES_VACIOS &&
            ultimaFechaLeida !== null &&
            ultimaFechaLeida > toDate
          ) {
            hasMore = false  // 🛑 early stop
            break
          }
        } else {
          batchesSinDatos = 0  // reset si encontramos datos en rango
        }

        if (values.length < PAGE_SIZE) {
          hasMore = false
        } else {
          startRow = startRow === 1 ? PAGE_SIZE + 1 : startRow + PAGE_SIZE
        }
      }
    } catch (apiError: any) {
      console.warn("Sheets API falló, usando CSV fallback:", apiError.message)
      useApiMode = false
    }

    // ── Fallback CSV público ──────────────────────────────────────────────────
    if (!useApiMode) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${dataSource.sheetId}/export?format=csv&sheet=${encodeURIComponent(tab)}`
      const csvRes = await fetch(csvUrl)
      if (!csvRes.ok) throw new Error(`CSV fallback falló: ${csvRes.statusText}`)

      const lines = (await csvRes.text()).split(/\r?\n/)
      if (lines.length === 0) throw new Error("CSV vacío")

      colMap = buildColMap(parseCSVLine(lines[0]))
      if (colMap.fecha === undefined) throw new Error("Columna Fecha no encontrada en CSV")

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue
        const row = parseCSVLine(lines[i])
        const fechaRaw = getVal(row, colMap, "fecha")
        const d = parseSheetDate(fechaRaw ?? "")
        if (d && d >= fromDate && d <= toDate) {
          allInRange.push(buildRecord(row, i + 1, colMap, tenantId))
        }
      }
    }

    // ── PASO 3: createMany en lotes de INSERT_BATCH ───────────────────────────
    // skipDuplicates evita errores si rowIndex+tenantId ya existe
    for (let b = 0; b < allInRange.length; b += INSERT_BATCH) {
      const slice = allInRange.slice(b, b + INSERT_BATCH)
      await prisma.orderRecord.createMany({
        data: slice,
        skipDuplicates: true,
      })
      totalRowsSynced += slice.length
    }

    // ── Registrar log y actualizar datasource ─────────────────────────────────
    await prisma.syncLog.create({
      data: {
        tenantId,
        status: "success",
        rowsSynced: totalRowsSynced,
        error: `Rango: ${from} → ${to} | Método: ${useApiMode ? "Sheets API" : "CSV fallback"} | Estrategia: DELETE+createMany`,
      },
    })

    await prisma.dataSource.update({
      where: { id: dataSource.id },
      data: { lastSyncAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      rowsSynced: totalRowsSynced,
      method: useApiMode ? "sheets_api" : "csv_fallback",
    })
  } catch (error: any) {
    console.error("Error en sincronización:", error)

    await prisma.syncLog.create({
      data: {
        tenantId,
        status: "error",
        rowsSynced: 0,
        error: `Rango: ${from} → ${to} | Error: ${error.message || "Desconocido"}`,
      },
    })

    return NextResponse.json(
      { error: "Error al sincronizar datos", details: error.message },
      { status: 500 }
    )
  }
}
