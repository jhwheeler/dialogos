---
name: pr-review
description: Performs pull request review by gathering PR description and diff, loading project standards, doing an independent pass of code review, then reconciling with existing review comments and producing a validated list of findings with a to-do and proposal. Use only when the user explicitly asks for a PR review (e.g. "review this PR", "use the PR review skill") and provides a PR number — not when they merely reference a PR in passing.
---

# Pull Request Review

## Trigger

Apply this skill **only when both** are true:

1. The user **explicitly asks for a review** (e.g. "review PR 42", "use the PR review skill on #123", "can you review this pull request?").
2. The user **provides a PR number or identifier** (in the same message or clearly in context).

Do **not** apply when the user only mentions a PR number without asking for a review (e.g. "see PR 42 for context", "this relates to #56").

---

When the trigger is met, follow this workflow.

> **Important — review independence**: You must complete your own full code review (steps 1–4) **before** looking at any existing review comments. This prevents anchoring on what others have already flagged and ensures you produce a genuinely independent analysis. Do not fetch or read existing reviews until step 5.

## 1. Gather PR context

- **PR number**: Use the number/ID the user gave (e.g. `123`).
- **Description and diff**: Fetch so you understand what the PR does and what changed.
  - GitHub: `gh pr view <number>` (description, metadata), `gh pr diff <number>` (diff). If `gh` is not available, use the GitHub API or the PR web URL and describe what you see.
- **Summary**: In 2–3 sentences, state the PR's goal and main areas of change (files/modules). Keep this for the final proposal.

## 2. Load project standards based on PR scope

Before reviewing, identify which areas the PR touches and load the relevant project resources. This ensures you review against our actual conventions — not generic best practices.

**Categorize the changes** by scanning the diff for affected areas, then load only what applies:

| PR touches…                                                          | Load this resource                                                                                                                  | Why                                                                              |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **API routes** (`src/api/`)                                          | Read **`skills/backend-development/SKILL.md`** and **`docs/BACKEND_ARCHITECTURE.md`**                                               | Enforces thin handlers, auth → validate → service → validate → return pattern    |
| **Service layer** (`src/services/`)                                  | Read **`skills/backend-development/SKILL.md`** and **`docs/TECH_SPEC.md`**                                                          | Ensures business logic stays in services, Socrates Mode rules are followed       |
| **Data source layer** (`src/data-sources/`)                          | Read **`skills/backend-development/SKILL.md`** and **`docs/BACKEND_ARCHITECTURE.md`**                                               | Ensures DataSources are Prisma-only with no business rules                       |
| **Type definitions** (`src/types/`)                                  | Read **`docs/BACKEND_ARCHITECTURE.md`** (Type files section)                                                                        | Enforces per-operation kebab-case files, Zod schema + inferred type exports      |
| **Mappers** (`src/mappers/`)                                         | Read **`docs/BACKEND_ARCHITECTURE.md`** (Mapper pattern section)                                                                    | Ensures correct static-class structure and directional naming                    |
| **Prisma schema or migrations** (`prisma/`)                          | Read **`skills/prisma-workflow/SKILL.md`** and **`prisma/schema.prisma`**                                                           | Verifies correct Prisma usage, migration approach, soft-delete preservation      |
| **Session or Socrates Mode logic** (session routes, services, turns) | Read **`docs/PRODUCT.md`** (Socrates Mode section) and **`docs/TECH_SPEC.md`** (Section 4: Socrates Mode Behavioral Contract)       | Enforces one-move-per-turn, no sycophancy, source-grounding, enforcement loop    |
| **Test files** (`test/`)                                             | Read existing test patterns in **`test/`** (e.g. `test/helpers/`, a representative test file)                                       | Ensures consistent test structure, helpers usage, assertion patterns              |
| **CI/CD or workflows** (`.github/`)                                  | Read **`.github/workflows/ci-cd.yml`**                                                                                              | Ensures pipeline consistency (lint, format, typecheck, test, build, deploy)      |
| **Error handling** (`src/errors/`)                                   | Read **`docs/BACKEND_ARCHITECTURE.md`** (Error class conventions section)                                                           | Ensures normalized error classes, not raw errors                                 |

**Notes:**

- Most PRs will touch 2–3 areas. Load all that apply — don't skip.
- **Always load** `docs/WORKFLOW.md` for any non-trivial PR — it covers PR conventions, product behavior constraints, and collaboration patterns.
- `CLAUDE.md` contains the project overview and quick rules. It's typically already in context, but read it if you need the high-level picture.

## 3. Do your own code review (independent — no existing reviews yet)

**This is the primary review pass.** Using the project standards you loaded in step 2, review the full diff as if no other reviews exist. Do not skim — examine every changed file and hunk. Your goal is to produce a thorough, independent analysis.

Check for:

- **Three-layer architecture compliance**: Is business logic in services, not route handlers? Are DataSources Prisma-only with no business rules? Are route handlers thin (auth → validate → service → validate → return)?
- **Type organization**: Are types defined per-operation in kebab-case files under the correct layer directory (`src/types/api/`, `src/types/service/`, `src/types/data-source/`)? Do they export both Zod schema and `z.infer` type? Are barrel files (`index.ts`) used correctly?
- **Zod validation at boundaries**: Does API input use `safeParse`? Is API output validated before returning? Are schemas defined in `src/types/api/`, not inline in route files?
- **Mapper usage**: When contracts differ across layers, are mappers used? Do they follow the static-class pattern with directional naming (e.g. `fromDataSourceToService`)?
- **Socrates Mode constraints** (if session/turn code is touched): One move per turn? No sycophancy or filler? Source-grounding tier logic correct? Enforcement loop intact?
- **Soft-delete preservation**: Are queries filtering by `deletedAt` where applicable? Do deletes set `deletedAt` rather than hard-deleting?
- **Error handling**: Are custom error classes used (`ApiError`, `NotFoundError`, etc.)? No raw `throw new Error()`?
- **Naming conventions**: camelCase for methods and data properties? kebab-case for type files? Method parameter name `input` in DataSources?
- **Test quality**: Are tests covering the changed behavior? Proper assertions? Using test helpers (`buildTestApp`, `createTestToken`, `prismaTestClient`)?
- **Prisma correctness** (if schema/migrations touched): Does the schema align with `docs/TECH_SPEC.md` domain objects? Are relations, indexes, and enums correct? Soft-delete (`deletedAt`) present on new models?
- **Security**: No secrets or credentials in code? Auth checks in place? Environment variables for sensitive values?
- **General**: Logic correctness, performance (N+1 queries, missing indexes), edge cases, CI compatibility (will lint/format/typecheck/test pass?).

Tag each finding with a short label (e.g. `architecture`, `type-system`, `validation`, `mapper`, `socrates-mode`, `soft-delete`, `error-handling`, `naming`, `test-quality`, `prisma`, `security`, `performance`, `bug-risk`) so you can refer to it in the final list.

## 4. Record your independent findings

Before proceeding, write down your complete list of findings from step 3. Each finding should have: file/area, label, and a concise description (1–3 lines) with a pointer to the code (file + line or snippet). **This is your independent review — commit to it before seeing what others said.**

## 5. Fetch existing review comments

**Now** — and only now — fetch existing review feedback:

- **Inline review comments** (attached to specific lines).
- **General reviews** (overall review body + approval/request-changes state).
- **Replies** to comments/reviews, which often contain important context (e.g. "will fix", "out of scope").
- GitHub:
  - Inline comments: `gh api repos/:owner/:repo/pulls/<number>/comments`
  - General reviews: `gh api repos/:owner/:repo/pulls/<number>/reviews`
  - Alternatively: `gh pr view <number> --json reviews,reviewComments,comments`
  - When using the GitHub API, replies to review comments are linked via `in_reply_to_id`; group each reply with its parent comment so you keep full threads.

If there are **no existing reviews**, skip to step 7.

## 6. Reconcile with existing reviews

Now merge the two sets of feedback. For each existing review comment:

- **Already covered**: If your independent review caught the same issue, note the overlap and keep your version (enriched with any extra context from the existing comment).
- **New and valid**: If an existing comment raises something you missed and it's correct, add it to your list.
- **Invalid or obsolete**: If an existing comment is wrong, outdated, or based on a misunderstanding, note it as "no action" with a brief reason.

For **every** item (your findings and existing comments):

- **Validity**: Is the comment/finding correct and relevant?
- **Actionability in scope**: Should this be addressed in _this_ PR, or is it out of scope (e.g. refactor, separate ticket)?

Options:

- **Valid, in scope**: Should be done in this PR — goes into the to-do list.
- **Valid, out of scope**: Correct but defer (e.g. follow-up issue) — note in proposal, not in to-do.
- **Invalid or obsolete**: Drop or mark as "no action" and briefly say why.

Record your verdict (1 line) per item so the to-do and proposal are defensible.

## 7. Produce the deliverable

### To-do list (for this PR)

Create a trackable checklist of all items that are **valid and in scope** using `TodoWrite`:

- **`content`**: A concise action description including the file/location (e.g. `Add soft-delete filter to getAll query (src/data-sources/widget/widget.data-source.ts:24)`).
- **`status`**: Set to `pending`.
- **`activeForm`**: Present continuous (e.g. `Adding soft-delete filter to getAll query`).

Create all tasks at once so the user gets a visible progress checklist.

### Proposal — return as text

Return a short text summary to the user:

- **Summary**: 2–3 sentences on what the PR does and the main change areas (from step 1).
- **Review summary**: Number (or brief recap) of your independent findings and existing comments; how many are in the to-do vs deferred vs no-action. Clearly distinguish your findings from existing reviewer comments.
- **Recommendations**: 1–2 short paragraphs: what to do in this PR (align with to-do), and what to track elsewhere (follow-ups, out-of-scope but valid points).
- **Optional**: Short note on any recurring themes (e.g. "several files are missing Zod output validation").

---

## Quick reference: GitHub CLI

If the repo is on GitHub and `gh` is available:

```bash
# PR description and metadata
gh pr view <number>

# Full diff
gh pr diff <number>

# List review comments (API)
gh api "repos/<owner>/<repo>/pulls/<number>/comments" --jq '.[] | {id: .id, in_reply_to_id: .in_reply_to_id, path: .path, line: .line, body: .body, user: .user.login}'

# General reviews (API)
gh api "repos/<owner>/<repo>/pulls/<number>/reviews" --jq '.[] | {id: .id, state: .state, body: .body, user: .user.login}'
```
