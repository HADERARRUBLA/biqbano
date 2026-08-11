import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { google } from "googleapis"

// ── Parsear fecha flexible para API y CSV fallback ─────────────────────────────
function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const str = dateStr.trim()
  
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }
  
  // Formato DD/MM/YYYY o D/M/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const [day, month, year] = str.split('/')
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return isNaN(d.getTime()) ? null : d
  }
  
  // Formato DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}/.test(str)) {
    const [day, month, year] = str.split('-')
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return isNaN(d.getTime()) ? null : d
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

// MAPEO FIJO para CSV fallback y API
const FIXED_COL_MAP = {
  fecha: 1,
  dia: 2,
  agente: 3,
  usuario: 4,
  turno: 5,
  antesDeLas12: 6,
  hora: 7,
  celular: 8,
  tipoSolicitud: 9,
  pdv: 10,
  total: 11,
  tipoPedido: 12
}

// Función para obtener valor por índice fijo
function getValByIndex(row: string[], idx: number): string {
  const val = row[idx]
  return val ? val.trim() : ''
}

// ── Construir registro para insertar ─────────────────────────────────────────
function buildRecord(
  row: string[],
  rowIndex: number,
  tenantId: string
) {
  const fechaRaw     = getValByIndex(row, 1)
  const parsedDate   = parseFlexibleDate(fechaRaw)
  const agente       = getValByIndex(row, 3) || null
  const pdv          = getValByIndex(row, 10) || null
  const tipoSolicitud = getValByIndex(row, 9) || null
  const tipoPedido   = getValByIndex(row, 12) || null
  const turno        = getValByIndex(row, 5) || null
  const horaRaw      = getValByIndex(row, 7)
  
  if (horaRaw) {
    console.log('[HORA RAW]', horaRaw)
  }

  const totalRaw = getValByIndex(row, 11)
  let parsedTotal: number | null = null
  if (totalRaw) {
    const cleanNum = totalRaw.replace(/[^0-9.-]/g, "").trim()
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
      fecha: getValByIndex(row, 1),
      dia: getValByIndex(row, 2),
      agente: getValByIndex(row, 3),
      usuario: getValByIndex(row, 4),
      turno: getValByIndex(row, 5),
      antesDeLas12: getValByIndex(row, 6),
      hora: getValByIndex(row, 7),
      celular: getValByIndex(row, 8),
      tipoSolicitud: getValByIndex(row, 9),
      pdv: getValByIndex(row, 10),
      total: getValByIndex(row, 11),
      tipoPedido: getValByIndex(row, 12),
    } as any,
    extraData: {} as any,
    syncedAt: new Date(),
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  let tenantId = ""
  let isCronMode = false
  let from = ""
  let to = ""
  let useApiMode = true
  let totalRowsSynced = 0

  try {
    const body = await req.json()
    isCronMode = body.cronMode === true
    const cronSecret = req.headers.get('x-cron-secret')
    const validCron = cronSecret === process.env.CRON_SECRET

    if (!isCronMode || !validCron) {
      const session = await auth()
      if (!session?.user || session.user.role !== "admin") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
      }
      tenantId = session.user.tenantId
    } else {
      tenantId = body.tenantId
    }

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
      console.log('[SYNC] Intentando Google Sheets API...')
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

        const startIndex = (startRow === 1) ? 1 : 0
        for (let i = startIndex; i < values.length; i++) {
          const row = (values[i] as any[]).map(String)
          const fechaRaw = getValByIndex(row, 1)
          const d = parseFlexibleDate(fechaRaw)
          if (d) ultimaFechaLeida = d
          if (d && d >= fromDate && d <= toDate) {
            allInRange.push(buildRecord(row, startRow + i, tenantId))
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
      console.error('[SYNC] API falló, razón:', apiError.message)
      console.log('[SYNC] Activando CSV fallback...')
      useApiMode = false
    }

    // ── Fallback CSV público ──────────────────────────────────────────────────
    if (!useApiMode) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${dataSource.sheetId}/export?format=csv&sheet=${encodeURIComponent(tab)}`
      const csvRes = await fetch(csvUrl)
      if (!csvRes.ok) throw new Error(`CSV fallback falló: ${csvRes.statusText}`)

      const lines = (await csvRes.text()).split(/\r?\n/)
      if (lines.length === 0) throw new Error("CSV vacío")

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue
        const row = parseCSVLine(lines[i])
        const fechaRaw = getValByIndex(row, 1)
        const d = parseFlexibleDate(fechaRaw)
        if (d && d >= fromDate && d <= toDate) {
          allInRange.push(buildRecord(row, i + 1, tenantId))
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
        source: isCronMode ? "cron" : "manual",
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

    // Solo guardar el log si logramos determinar el tenantId
    if (tenantId) {
      await prisma.syncLog.create({
        data: {
          tenantId,
          status: "error",
          rowsSynced: 0,
          source: isCronMode ? "cron" : "manual",
          error: `Rango: ${from} → ${to} | Error: ${error.message || "Desconocido"}`,
        },
      })
    }

    return NextResponse.json(
      { error: "Error al sincronizar datos", details: error.message },
      { status: 500 }
    )
  }
}
