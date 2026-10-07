# FairShare

A modern expense-sharing application built with Next.js, featuring secure authentication and an intuitive design system.

## ✨ Features

- 🔐 **Secure Authentication** - Password and passwordless (WebAuthn) login
- 💰 **Expense Splitting** - Equal, exact, percentage, shares and itemized (per-item) splits, with multiple payers
- 👥 **Groups & Invites** - Invite by email; people without an account can be added to expenses right away and claim their balance when they sign up
- ⚖️ **Settle Up** - Live balances per group, the fewest payments needed to settle, and a record of payments made
- 📱 **Responsive Design** - Works on all device sizes
- ♿ **Accessibility** - WCAG compliant design system

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and authentication settings
   ```

3. **Create the database schema**
   ```bash
   pnpm exec prisma migrate deploy
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

## ✅ Checks

```bash
pnpm test        # money / balance unit tests (vitest)
pnpm typecheck
pnpm lint
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.2 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Auth.js v5 with WebAuthn support
- **Styling**: Tailwind CSS with custom design system
- **Typography**: Geist font family

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[📖 Complete Documentation](./docs/README.md)** - Overview and navigation
- **[📊 Project Status](./docs/STATUS.md)** - Current development status and next steps
- **[📋 Development Roadmap](./docs/TODO.md)** - Complete feature roadmap
- **[🚀 Quick Wins](./docs/QUICK_WINS.md)** - High-impact tasks for immediate implementation
- **[🎨 Design System](./docs/design-system/)** - Colors, typography, components
- **[⚙️ Setup Guides](./docs/setup/)** - Installation and configuration
- **[🔧 Troubleshooting](./docs/troubleshooting/)** - Common issues and solutions

## 🔗 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Auth.js Documentation](https://authjs.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
