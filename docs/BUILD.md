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

## CI/CD (GitHub Actions)
- Workflow file: `.github/workflows/ci-cd.yml`
- Triggers:
  - Every push to any branch (`push`)
  - Pull request updates (`pull_request` opened/synchronize/reopened)
- CI jobs (run in parallel):
  - `Lint`: `npm run lint`
  - `Format check`: `npm run format:check`
  - `Typecheck`: `npm run typecheck`
  - `Test`: `npm run test` (with Postgres service + migrations)
  - `Build`: `npm run build` + uploads `dist/` artifact
- Deployment strategy:
  - Deploy job waits for all CI jobs.
  - Built files from `dist/` are published to a dedicated `deployments` branch.
  - Push builds are published at `branches/<branch-name>`.
  - PR builds are published at `previews/pr-<number>`.
  - This gives each PR an isolated deploy-preview path while preserving branch deployments.

## Future additions
- Production infrastructure deploy (e.g., cloud runtime + secrets)
- CI test suite once backend tests are added
- Local queue worker startup instructions
