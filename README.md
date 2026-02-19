# Dialogos Backend

Initial backend foundation for Dialogos v0.1 using Fastify + TypeScript + Prisma.

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
