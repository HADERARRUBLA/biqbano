## Estado de fases
- Fase 1: ✅ COMPLETADA — Auth + Tenant + BD
- Fase 2: ✅ COMPLETADA — Google Sheets → PostgreSQL
- Fase 3: ✅ COMPLETADA — Dashboard Core (KPIs + Gráficas + Filtros)
- Consolidación: ✅ COMPLETADA — API Key real + Sync optimizada
- Fase 4: ✅ COMPLETADA — Exportaciones + Dashboard Personalizable
- Fase 5: ✅ COMPLETADA — Control de acceso por rol
- Fase 6: ✅ COMPLETADA — 4 widgets analíticos avanzados
- Fase 7: ✅ COMPLETADA — Cron sync automática 2am Colombia
- Fase 8: ✅ COMPLETADA — Gestión de usuarios desde UI
- Fase 9: ✅ COMPLETADA — Filtros configurables por usuario
- Fase 10: ✅ COMPLETADA — Fix DatePicker + Fix filtros globales

## Bugs resueltos en producción
- DatePicker: reemplazado Input Shadcn por input nativo HTML
- Filtros globales: ahora se propagan via URL params a todos 
  los widgets incluyendo los 4 avanzados
- Horas AM/PM: corregido parseo en widget Distribución Horaria
- Calendario: valores en COP abreviado ($18,6M), 
  barras de color por tipo, defaults guardados en localStorage
- KPI widgets: cada uno muestra una sola métrica individual
- Grid resizable: botones 1/3, 1/2, Full en modo edición
- Dashboard nuevo: empieza vacío sin widgets predeterminados

## Producción
- URL: https://biqbano.vercel.app
- GitHub: https://github.com/HADERARRUBLA/biqbano (público)
- BD: Supabase proyecto SitiosWEB (98,117 registros)
- Cron: diario 7:00 UTC (2:00am Colombia), últimos 7 días
- Datos: Enero 2026 → Junio 2026

## Reglas de desarrollo (NO romper)
- NUNCA usar require() — solo import ES modules
- SIEMPRE export const dynamic = 'force-dynamic' en páginas
- NUNCA hacer git push — solo git add + git commit
- SIEMPRE npx tsc --noEmit antes del commit
- Sync usa deleteMany por rango + createMany con skipDuplicates
- Conexión BD: pooler puerto 5432, NO puerto 6543
- prisma db push (NO prisma migrate dev)
- Input de fecha: usar input HTML nativo type="date"

## Stack
- Next.js 14 + TypeScript
- Prisma ORM + PostgreSQL (Supabase)
- NextAuth.js v5
- Shadcn/ui + Recharts + Tailwind CSS
- @hello-pangea/dnd (drag & drop)
- xlsx + jspdf (exportaciones)
- googleapis (Google Sheets API)
