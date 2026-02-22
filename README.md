# Dialogos Backend

Backend foundation for Dialogos v0.1.

Dialogos is a voice-first oral practice app that enforces Socratic, trivium-oriented learning constraints.

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Validate Prisma schema:
   ```bash
   npm run prisma:validate
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```

## Current endpoints

- `GET /v1/health`

## Docs

- Product overview: `docs/PRODUCT.md`
- Technical spec baseline: `docs/TECH_SPEC.md`
- Security audit: `docs/SECURITY_AUDIT.md`
- Build and run guide: `docs/BUILD.md`
- Development workflow: `docs/WORKFLOW.md`
- Backend architecture guide: `docs/BACKEND_ARCHITECTURE.md`
