# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
- `pnpm dev` - Start development server with Next.js 15 + Turbopack
- `pnpm build` - Build production app with Turbopack
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint for code quality checks

### Database Operations
- `pnpm db:generate` - Generate Prisma client after schema changes
- `pnpm db:push` - Push schema changes to database (development)
- `pnpm db:migrate` - Create and run database migrations (production)
- `pnpm db:studio` - Open Prisma Studio for database management
- `pnpm db:seed` - Seed database with initial data

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.5.2 with App Router and Turbopack
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Auth.js v5 with WebAuthn passkey support
- **Styling**: Tailwind CSS v4 with custom design system
- **Typography**: Geist font family
- **Language**: TypeScript with strict type checking

### Project Structure

**Core Application (`src/`):**
- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable React components
- `lib/` - Utility libraries and database client
- `hooks/` - Custom React hooks (WebAuthn, user preferences)
- `types/` - TypeScript type definitions

**Key Files:**
- `auth.ts` - Auth.js configuration with credentials and Google OAuth
- `prisma/schema.prisma` - Complete database schema for expense sharing
- `src/lib/prisma.ts` - Prisma client singleton

### Authentication System

**Multi-Provider Setup:**
- Email/password credentials with bcrypt
- WebAuthn passkey support for passwordless login
- Google OAuth (conditional on environment variables)
- Special "webauthn-verified" password flow for passkey integration

**Key Authentication Files:**
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js handler
- `src/hooks/useWebAuthn.ts` - WebAuthn client-side logic
- `src/app/api/webauthn/` - WebAuthn server endpoints

### Database Schema Architecture

**Complex Multi-Entity System:**

**User Management:**
- `User` - Core user accounts with auth integration
- `UserPreferences` - Theme, currency, timezone, language settings
- `UserNotificationSetting` - Granular notification controls
- `Authenticator` - WebAuthn credentials storage

**Expense Management:**
- `Expense` - Main expense records with multiple payers support
- `ExpensePayer` - Track who paid what amount (many-to-many)
- `ExpenseSplit` - How expenses are split among participants
- `ExpenseItem` - Line-item breakdown for detailed receipts
- `ExpenseItemSplit` - Splits for individual receipt items

**Group Management:**
- `Group` - Shared expense groups with settings
- `GroupMember` - User membership with roles (OWNER/ADMIN/MEMBER)
- `GroupInvitation` - Token-based group invitations
- `GroupSetting` - Configurable group preferences

**Settlement System:**
- `Settlement` - Payment records between users
- Supports multiple settlement methods (cash, Venmo, PayPal, etc.)
- Tracks settlement status (pending, confirmed, rejected)

### API Design Patterns

**RESTful Structure:**
- `/api/auth/` - Authentication endpoints
- `/api/user/` - User management and preferences
- `/api/groups/` - Group CRUD with nested member/expense endpoints
- `/api/expenses/` - Expense management
- `/api/webauthn/` - WebAuthn registration/authentication

**Key API Features:**
- Comprehensive input validation with error handling
- Session-based authorization
- Support for complex operations (multi-payer expenses, settlements)

### Development Status

**✅ Completed (Production Ready):**
- Complete authentication system with WebAuthn
- User preferences and account management
- Comprehensive database schema
- Design system and responsive UI foundation

**🚧 Implementation Needed:**
- Core expense CRUD operations
- Group management interfaces
- Settlement tracking system
- Receipt upload functionality

### Important Development Notes

**Database Operations:**
- Always run `pnpm db:generate` after schema changes
- Use `pnpm db:push` for development, `pnpm db:migrate` for production
- Database uses PostgreSQL with comprehensive indexing for performance

**Authentication Flow:**
- WebAuthn integration requires special credential handling
- Session strategy is JWT-based for credentials provider
- Database sessions for OAuth providers

**Design System:**
- Comprehensive design tokens in `docs/design-system/`
- Mobile-first responsive approach
- WCAG accessibility compliance

**Error Handling:**
- Robust error boundaries and validation
- Comprehensive API error responses
- User-friendly error messages throughout

### Useful Documentation

**Project Documentation (`docs/`):**
- `docs/STATUS.md` - Current development status and roadmap  
- `docs/RFC_EXPENSE_GROUP_SYSTEM.md` - Complete system architecture
- `docs/design-system/` - Design tokens and component guidelines
- `docs/setup/` - Configuration guides for Prisma, Auth.js, WebAuthn

**For Complex Features:**
- Check existing implementation patterns in API routes
- Reference Prisma schema for relationship understanding
- Use existing components as templates for new features