# Prisma Setup Guide

This project is configured to use Prisma with PostgreSQL using two connection URLs for optimal performance.

## Environment Variables

You need to set up the following environment variables in your `.env` file:

```env
# Pooled connection URL for application queries (use with connection pooling)
POSTGRES_PRISMA_URL="postgresql://username:password@host:port/database?pgbouncer=true&connection_limit=1"

# Direct connection URL for migrations and schema operations (no pooling)
POSTGRES_URL_NON_POOLING="postgresql://username:password@host:port/database"
```

## Setup Instructions

1. **Copy environment variables**:

   ```bash
   cp .env.example .env
   ```

2. **Update the `.env` file** with your actual PostgreSQL connection strings.

3. **Generate Prisma Client**:

   ```bash
   pnpm db:generate
   ```

4. **Push your schema to the database** (for development):

   ```bash
   pnpm db:push
   ```

   OR **Run migrations** (for production):

   ```bash
   pnpm db:migrate
   ```

## Available Scripts

- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:push` - Push schema changes to database (development)
- `pnpm db:migrate` - Run database migrations (production)
- `pnpm db:studio` - Open Prisma Studio (database GUI)

## Usage in Your Application

Import the Prisma client from the configured instance:

```typescript
import { prisma } from "@/lib/prisma";

// Example usage
const users = await prisma.user.findMany();
```

## Health Check

Test your database connection by visiting:

```
GET /api/health
```

This endpoint will verify that your database connection is working properly.

## Connection Strategy

- **`DATABASE_URL`** (uses `POSTGRES_PRISMA_URL`) - Used for application queries with connection pooling
- **`DIRECT_URL`** (uses `POSTGRES_URL_NON_POOLING`) - Used for migrations and schema operations without pooling

This setup ensures optimal performance for both application queries and database maintenance operations.
