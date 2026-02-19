---
name: backend-development
description: Use this skill when implementing or updating Dialogos backend features (Fastify + TypeScript), especially Socrates Mode constraints, session lifecycle, and API/service/dataSource layering.
---

# Backend Development Skill

## Use this when
- adding/updating API endpoints in `src/api/v1`
- implementing business logic in `src/services`
- adding persistence logic in `src/dataSources`
- touching session loop behavior

## Workflow
1. Confirm behavior against `docs/PRODUCT.md` and `docs/TECH_SPEC.md`.
2. Keep route handlers thin; move orchestration to services.
3. Keep DataSources Prisma-only (no business rules).
4. Enforce Socrates Mode rules:
   - one move per turn
   - concise prompt
   - no sycophancy or unsolicited recap
5. Add/adjust tests for changed behavior.
6. Update docs when contracts or flows change.
