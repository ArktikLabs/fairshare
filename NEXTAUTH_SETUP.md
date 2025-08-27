# NextAuth.js Integration Guide

This project has been successfully integrated with NextAuth.js using the Credentials provider for authentication. Here's everything you need to know about the authentication system.

## ✅ What's Been Set Up

### 1. **Packages Installed**

- `next-auth` - Main authentication library
- `bcryptjs` - Password hashing
- `@types/bcryptjs` - TypeScript types for bcryptjs

### 2. **Database Schema**

A `User` model has been added to your Prisma schema:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

### 3. **Authentication Configuration**

- **File**: `src/lib/auth.ts`
- **Provider**: Credentials (email/password)
- **Session Strategy**: JWT (required for credentials)
- **Password Hashing**: bcryptjs with salt rounds of 12

### 4. **API Routes**

- `GET/POST /api/auth/[...nextauth]` - NextAuth.js handler
- `POST /api/auth/register` - User registration endpoint

### 5. **Pages Created**

- `/auth/signin` - Sign in page with email/password form
- `/auth/register` - User registration page
- `/dashboard` - Protected dashboard page
- `/` - Updated home page with authentication state

### 6. **Components**

- `AuthProvider` - Session provider wrapper for the app
- Updated `layout.tsx` to include session provider

### 7. **Environment Variables**

Added to `.env`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-please-change-this-in-production
```

## 🚀 Usage

### Registration Flow

1. User visits `/auth/register`
2. Enters email, password, and optional name
3. Password is hashed and user is stored in database
4. Redirects to sign-in page

### Authentication Flow

1. User visits `/auth/signin`
2. Enters email and password
3. Credentials are verified against database
4. JWT token is created and session is established
5. User is redirected to `/dashboard`

### Session Management

```typescript
import { useSession } from "next-auth/react";

function MyComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Loading...</p>;
  if (!session) return <p>Not signed in</p>;

  return <p>Signed in as {session.user?.email}</p>;
}
```

### Server-side Session

```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function ServerComponent() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <p>Not authenticated</p>;
  }

  return <p>Welcome {session.user?.email}</p>;
}
```

## 🔧 Customization

### Adding More Fields to User Model

1. Update the Prisma schema in `prisma/schema.prisma`
2. Run `pnpm db:push` to update the database
3. Update the registration form and API
4. Update the authentication callback if needed

### Adding OAuth Providers

1. Install provider packages (e.g., `@next-auth/google-provider`)
2. Add provider configuration to `src/lib/auth.ts`
3. Update environment variables
4. Add provider buttons to sign-in page

### Customizing Pages

- Modify `/auth/signin/page.tsx` for custom sign-in UI
- Modify `/auth/register/page.tsx` for custom registration UI
- Update `authOptions.pages` in `src/lib/auth.ts` for custom page routes

## 🔒 Security Features

1. **Password Hashing**: Uses bcryptjs with 12 salt rounds
2. **CSRF Protection**: NextAuth.js includes CSRF tokens
3. **Secure Cookies**: Configured for production security
4. **JWT Encryption**: Tokens are encrypted by default
5. **Session Validation**: Automatic session validation and refresh

## 🛠️ Development Commands

```bash
# Start development server
pnpm dev

# Generate Prisma client (after schema changes)
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Open Prisma Studio (database GUI)
pnpm db:studio
```

## 📝 Important Notes

1. **Change NEXTAUTH_SECRET**: Generate a secure secret for production
2. **Database**: The User table has been created in your PostgreSQL database
3. **JWT Sessions**: Using JWT sessions instead of database sessions for credentials provider
4. **Type Safety**: TypeScript types have been extended for NextAuth

## 🎯 Next Steps

1. **Generate a secure secret**:
   ```bash
   openssl rand -base64 32
   ```
2. **Test the authentication**:

   - Visit `/auth/register` to create an account
   - Visit `/auth/signin` to sign in
   - Visit `/dashboard` to see the protected page

3. **Customize the UI** to match your application design

4. **Add role-based authorization** if needed

The authentication system is now fully functional and ready for use!
