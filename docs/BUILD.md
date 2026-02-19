# Build & Run

## Backend local setup
1. Install dependencies: `npm install`
2. Copy environment file: `cp .env.example .env`
3. Validate Prisma schema: `npm run prisma:validate`
4. Start development server: `npm run dev`

## Near-term build targets
- Backend: Fastify + TypeScript + Prisma + Postgres
- Mobile client: Flutter
- Storage: Supabase Storage or S3-compatible storage

## Future additions
- Production build/deploy steps
- CI pipeline details
- Local queue worker startup instructions
