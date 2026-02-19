# Backend Architecture Guide

This document defines the canonical backend layering and type patterns for Dialogos.

## Guiding decisions

- **Layer order**: API → Service → DataSource.
- **DataSource responsibilities**: Prisma CRUD only; no business rules.
- **Service responsibilities**: orchestration, business logic, and shaping values for API needs.
- **Type validation**: all external boundaries use Zod `safeParse`.
- **Naming and casing**:
  - method names are `camelCase` in classes (for JavaScript/TypeScript consistency),
  - type files are **kebab-case**,
  - data properties use **camelCase**, including Prisma model fields.

## Folder and naming conventions

### Type files

Every operation has dedicated input/output type files.

```text
src/
  types/
    data-source/
      widget/
        get-one.ts
        create-one.ts
        update-one.ts
        delete-one.ts
    service/
      widget/
        get-one.ts
        create-one.ts
        update-one.ts
        delete-one.ts
```

Example barrels:

```ts
// src/types/data-source/widget/index.ts
export * from "./get-one";
export * from "./create-one";
export * from "./update-one";
export * from "./delete-one";

// src/types/service/widget/index.ts
export * from "./get-one";
export * from "./create-one";
export * from "./update-one";
export * from "./delete-one";
```

Rules:

- File name is operation in kebab case (`get-one.ts`).
- Export both:
  - `<Operation><Namespace><Layer>InputSchema`
  - `<Operation><Namespace><Layer>Input`
- Output follows same rule with `OutputSchema` / `Output`.
- Types are built with `z.infer<typeof Schema>`.
- Create an `index.ts` barrel per namespace + layer (for example `src/types/data-source/widget/index.ts`).
- Import operation types from that namespace barrel, not one file per operation and not a global root barrel.

Example (`src/types/data-source/widget/get-one.ts`):

```ts
import { z } from "zod";

export const GetOneWidgetDataSourceInputSchema = z.object({
  id: z.string().uuid(),
});

export type GetOneWidgetDataSourceInput = z.infer<
  typeof GetOneWidgetDataSourceInputSchema
>;

export const GetOneWidgetDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isArchived: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type GetOneWidgetDataSourceOutput = z.infer<
  typeof GetOneWidgetDataSourceOutputSchema
>;
```

## DataSource example (Prisma CRUD)

```ts
} from "../../types/data-source/widget";
  DeleteOneWidgetDataSourceOutput,
} from "../../types/data-source/widget/delete-one";
import type {
  GetOneWidgetDataSourceInput,
  GetOneWidgetDataSourceOutput,
} from "../../types/data-source/widget/get-one";
import type {
  UpdateOneWidgetDataSourceInput,
  UpdateOneWidgetDataSourceOutput,
} from "../../types/data-source/widget/update-one";

export class WidgetDataSource {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getOne(
    input: GetOneWidgetDataSourceInput,
  ): Promise<GetOneWidgetDataSourceOutput | null> {
    return this.prisma.widget.findUnique({
      where: { id: input.id },
    });
  }

  public async createOne(
    input: CreateOneWidgetDataSourceInput,
  ): Promise<CreateOneWidgetDataSourceOutput> {
    return this.prisma.widget.create({
      data: {
        name: input.name,
      },
    });
  }

  public async updateOne(
    input: UpdateOneWidgetDataSourceInput,
  ): Promise<UpdateOneWidgetDataSourceOutput> {
    return this.prisma.widget.update({
      where: { id: input.id },
      data: {
        name: input.name,
        isArchived: input.isArchived,
      },
    });
  }

  public async deleteOne(
    input: DeleteOneWidgetDataSourceInput,
  ): Promise<DeleteOneWidgetDataSourceOutput> {
    return this.prisma.widget.delete({
      where: { id: input.id },
    });
  }
}
```

Key rule: method parameter name is always `input`.

## Service layer example

Service type files mirror DataSource type files, but may shape different contracts for API needs.

```ts
import type {
  CreateOneWidgetServiceInput,
  CreateOneWidgetServiceOutput,
  DeleteOneWidgetServiceInput,
  DeleteOneWidgetServiceOutput,
  GetOneWidgetServiceInput,
  GetOneWidgetServiceOutput,
  UpdateOneWidgetServiceInput,
  UpdateOneWidgetServiceOutput,
} from "../../types/service/widget";
import { NotFoundError } from "../../errors/not-found-error";
import { WidgetDataSource } from "../../data-sources/widget/widget.data-source";
import { WidgetMapper } from "../../mappers/widget.mapper";

export class WidgetService {
  public constructor(private readonly widgetDataSource: WidgetDataSource) {}

  public async getOne(
    input: GetOneWidgetServiceInput,
  ): Promise<GetOneWidgetServiceOutput> {
    const widget = await this.widgetDataSource.getOne({ id: input.id });

    if (!widget) {
      throw new NotFoundError("Widget not found");
    }

    return WidgetMapper.getOne.output.fromDataSourceToService(widget);
  }

  public async createOne(
    input: CreateOneWidgetServiceInput,
  ): Promise<CreateOneWidgetServiceOutput> {
    const widget = await this.widgetDataSource.createOne({
      name: input.name,
    });

    return WidgetMapper.createOne.output.fromDataSourceToService(widget);
  }

  public async updateOne(
    input: UpdateOneWidgetServiceInput,
  ): Promise<UpdateOneWidgetServiceOutput> {
    const widget = await this.widgetDataSource.updateOne({
      id: input.id,
      name: input.name,
      isArchived: input.isArchived,
    });

    return WidgetMapper.updateOne.output.fromDataSourceToService(widget);
  }

  public async deleteOne(
    input: DeleteOneWidgetServiceInput,
  ): Promise<DeleteOneWidgetServiceOutput> {
    const widget = await this.widgetDataSource.deleteOne({
      id: input.id,
    });

    return WidgetMapper.deleteOne.output.fromDataSourceToService(widget);
  }
}
```

## Mapper pattern

Use mapper functions when contracts differ across layers.

```ts
import type { GetOneWidgetDataSourceOutput } from "../types/data-source/widget";
import type { GetOneWidgetServiceOutput } from "../types/service/widget";

export class WidgetMapper {
  public static readonly getOne = {
    output: {
      fromDataSourceToService(
        input: GetOneWidgetDataSourceOutput,
      ): GetOneWidgetServiceOutput {
        return {
          id: input.id,
          name: input.name,
        };
      },
    },
  };
}
```

Pattern requirements:

- Mapper is a class with static operation properties (`getOne`, `createOne`, etc.).
- Each operation can define `input` and/or `output` transformations.
- Transformation function names must describe direction (`fromDataSourceToService`).

## API route pattern (auth → validate input → service → validate output)

```ts
import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import { WidgetService } from "../../services/widget/widget.service";
import { ApiError } from "../../errors/api-error";

const GetWidgetParamsSchema = z.object({
  widgetId: z.string().uuid(),
});

const GetWidgetResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const widgetRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/widgets/:widgetId", async (request, reply) => {
    await fastify.authenticate(request, reply);

    const inputValidation = GetWidgetParamsSchema.safeParse(request.params);

    if (!inputValidation.success) {
      throw ApiError.validation("Invalid widgetId", inputValidation.error);
    }

    const widgetService = new WidgetService(fastify.widgetDataSource);
    const serviceOutput = await widgetService.getOne({
      id: inputValidation.data.widgetId,
    });

    const outputValidation = GetWidgetResponseSchema.safeParse(serviceOutput);

    if (!outputValidation.success) {
      throw ApiError.internal("Invalid service response", outputValidation.error);
    }

    return reply.send(outputValidation.data);
  });
};
```

## Error class conventions

Create explicit domain/application errors, then map to a normalized API error envelope.

Suggested classes:

- `ApiError` (base HTTP-facing error)
- `AuthenticationError`
- `AuthorizationError`
- `ValidationError`
- `NotFoundError`
- `ConflictError`
- `InternalServerError`

Example shape:

```ts
export class ApiError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }

  public static validation(message: string, details?: unknown): ApiError {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  public static authentication(message = "Unauthorized"): ApiError {
    return new ApiError(401, "AUTHENTICATION_ERROR", message);
  }

  public static notFound(message = "Not found"): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  public static internal(message = "Internal server error", details?: unknown): ApiError {
    return new ApiError(500, "INTERNAL_SERVER_ERROR", message, details);
  }
}
```

## Summary checklist

- Define per-operation type files in kebab case.
- Export both Zod schema and `z.infer` type.
- Add namespace+layer barrels and import from those barrels.
- Keep DataSource methods Prisma-only and parameter name `input`.
- Keep Service logic in service classes.
- Add mapper transformations only where needed.
- In API: authenticate, validate input (`safeParse`), call service, validate output (`safeParse`), return validated JSON.
- Throw normalized error classes, not raw errors.
