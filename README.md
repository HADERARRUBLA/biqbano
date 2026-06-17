# BIQBANO — BI Analytics

Dashboard de análisis de pedidos de ventas 
conectado a Google Sheets.

## Stack
- Next.js 14 + TypeScript
- Prisma ORM + PostgreSQL (Supabase)
- NextAuth.js v5
- Shadcn/ui + Recharts + Tailwind CSS

## Requisitos
- Node.js v18+
- PostgreSQL (Supabase recomendado)
- Google Sheets API Key

## Instalación local
1. git clone https://github.com/[usuario]/biqbano.git
2. cd biqbano
3. npm install
4. cp .env.production.example .env
5. Editar .env con tus valores
6. npx prisma generate
7. npx prisma db push
8. npx prisma db seed
9. npm run dev

## Variables de entorno
- DATABASE_URL: conexión PostgreSQL
- NEXTAUTH_SECRET: string aleatorio
- NEXTAUTH_URL: URL base de la app
- GOOGLE_SHEETS_API_KEY: Google Cloud Console

## Roles
- Admin: configura datos, crea y asigna dashboards
- Viewer: visualiza dashboard asignado con filtros
