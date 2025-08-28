# Setup & Implementation Guides

Step-by-step guides for setting up and implementing various features of the FairShare application.

## Database & Backend

| Guide                             | Description                                       | Status      |
| --------------------------------- | ------------------------------------------------- | ----------- |
| [Prisma Setup](./PRISMA_SETUP.md) | Database configuration with Prisma and PostgreSQL | ✅ Complete |

## Authentication

| Guide                                                   | Description                                   | Status      |
| ------------------------------------------------------- | --------------------------------------------- | ----------- |
| [Auth.js v5 Migration](./AUTHJS_V5_MIGRATION.md)        | Complete guide from NextAuth v4 to Auth.js v5 | ✅ Complete |
| [WebAuthn Implementation](./WEBAUTHN_IMPLEMENTATION.md) | Passwordless authentication with WebAuthn     | ✅ Complete |

## Setup Order

For new projects, follow this recommended setup order:

1. **[Prisma Setup](./PRISMA_SETUP.md)** - Set up database and schema
2. **[Auth.js v5 Migration](./AUTHJS_V5_MIGRATION.md)** - Set up Auth.js v5 authentication
3. **[WebAuthn Implementation](./WEBAUTHN_IMPLEMENTATION.md)** - Add passwordless authentication

## Technology Stack

- **Framework**: Next.js 15.5.2 with App Router
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma 6.14.0
- **Authentication**: Auth.js v5.0.0-beta.29
- **WebAuthn**: SimpleWebAuthn v9.0.2
- **Styling**: Tailwind CSS with custom design system
- **Font**: Geist font family
