---
name: prisma-workflow
description: Use this skill when changing Dialogos Prisma schema, migrations, or query patterns for students/topics/sessions/turns/artifacts.
---

# Prisma Workflow Skill

## Use this when
- modifying `prisma/schema.prisma`
- adding relations/indexes for session and turn queries
- implementing data access changes in `src/dataSources`

## Workflow
1. Align schema changes with `docs/TECH_SPEC.md` domain objects.
2. Update Prisma models and relations.
3. Preserve soft-delete strategy where applicable.
4. Validate schema: `npm run prisma:validate`.
5. Regenerate Prisma client when needed.
6. Update docs if entity contracts changed.
