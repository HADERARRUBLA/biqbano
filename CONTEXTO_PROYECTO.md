# BIQBANO — Contexto del Proyecto

## Estado de fases
- Fase 1: ✅ COMPLETADA — Auth + Tenant + BD
- Fase 2: ✅ COMPLETADA — Google Sheets → PostgreSQL
- Fase 3: ✅ COMPLETADA — Dashboard Core (KPIs + Gráficas + Filtros)
- Consolidación: ✅ COMPLETADA — API Key real + Sync optimizada
- Fase 4: 🔄 EN PROGRESO — Exportaciones + Dashboard Personalizable
- Fase 5: ⏳ PENDIENTE — Múltiples fuentes + Pulido final

## Stack
- Next.js 14 + TypeScript
- Prisma ORM + PostgreSQL (Supabase)
- NextAuth.js v5
- Shadcn/ui + Tailwind
- googleapis (Sheets API v4)
- recharts + date-fns

## Base de datos (Supabase - proyecto SitiosWEB)
- Prefijo de tablas: bq_
- Tabla externa preservada: images (43 filas)
- Tablas creadas: bq_tenants, bq_users, bq_data_sources,
  bq_sync_logs, bq_order_records, bq_accounts,
  bq_sessions, bq_verification_tokens

## Usuarios de prueba
- Admin: admin@demo.com / Admin1234!
- Viewer: viewer@demo.com / Viewer1234!
- Tenant: "Empresa Demo" (slug: demo)

## Rutas principales
- /login → autenticación
- /dashboard/[tenant]/overview → dashboard principal
- /admin/[tenant]/settings → configuración (solo admin)

## Decisiones técnicas
- prisma db push (no migrate dev) por tabla images existente
- Conexión via pooler: aws-1-us-east-1.pooler.supabase.com:5432
- @@ignore en modelo Image para preservar tabla existente
- Sync: deleteMany(rango) + createMany(500) — NO upsert individual
- valueRenderOption: FORMATTED_VALUE — NO UNFORMATTED_VALUE (rompe fechas)
- $transaction prohibido para lotes grandes → usa createMany en su lugar

## Data real sincronizada
- Sheet ID: 1kTU6GtmduVlaTmixkHHqDsF0rogMfUVjNE6nYiZeCuk
- Pestaña real: "Libro General de Ventas" (no "Sheet1")
- Columnas: Fecha, Día, Agente, Usuario, Turno, Antes de las 12,
  Hora, Celular, Tipo de Solicitud, PDV, Total, Tipo de Pedido
- Primera columna (A) del Sheet es vacía — buildColMap() la ignora
- Volumen total: ~98,118 filas
- Registros en BD: 26,339 (enero + febrero 2026)

## Métricas de sync validadas
- Velocidad: ~63s por mes completo
- Early stop: activa tras 3 batches vacíos consecutivos post-rango
  (condición: batchesSinDatos >= 3 AND ultimaFechaLeida > toDate)
- Tamaño de batch lectura: 900 filas/request (límite API: 1000)
- Inserción: createMany en lotes de 500 registros
- Volumen probado: 26,339 registros (enero + febrero 2026)
- Enero: 13,595 filas | Febrero: 12,744 filas
- Ventas totales acumuladas: $721,597,579

## Optimización pendiente (post-MVP)
- Binary search para saltar al primer batch del rango (evitar leer meses
  anteriores al rango solicitado — actualmente lee desde la fila 1)
