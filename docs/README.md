# FairShare Documentation

Complete documentation for the FairShare expense-sharing application, including setup guides, design system, troubleshooting, and development roadmap.

## 📖 Table of Contents

- [🎨 Design System](#-design-system)
- [⚙️ Setup & Implementation](#%EF%B8%8F-setup--implementation)
- [🔧 Troubleshooting](#-troubleshooting)
- [📋 Development Planning](#-development-planning)
- [📱 Application Overview](#-application-overview)

## 🎨 Design System

The FairShare Design System provides a unified set of design principles, components, and guidelines to ensure consistency across all user interfaces.

### Design System Documentation

| File | Description |
|------|-------------|
| [Colors](./design-system/colors.md) | Color palette, usage guidelines, and accessibility |
| [Typography](./design-system/typography.md) | Font system, scales, and text treatments |
| [Spacing](./design-system/spacing.md) | Layout spacing, padding, margins, and grid |
| [Components](./design-system/components.md) | UI component library and usage |
| [Icons](./design-system/icons.md) | Icon system and guidelines |
| [Layout](./design-system/layout.md) | Grid system, containers, and responsive design |
| [Animation](./design-system/animation.md) | Motion design and interaction patterns |

## ⚙️ Setup & Implementation

Step-by-step guides for setting up and implementing various features of the FairShare application.

| File | Description |
|------|-------------|
| [Prisma Setup](./setup/PRISMA_SETUP.md) | Database configuration with Prisma and PostgreSQL |
| [Auth.js v5 Migration](./setup/AUTHJS_V5_MIGRATION.md) | Complete authentication setup with Auth.js v5 |
| [WebAuthn Implementation](./setup/WEBAUTHN_IMPLEMENTATION.md) | Passwordless authentication with WebAuthn |

## 🔧 Troubleshooting

Common issues and their solutions.

| File | Description |
|------|-------------|
| [Auto Logout Fix](./troubleshooting/AUTO_LOGOUT_FIX.md) | Resolving auto-logout issues after WebAuthn authentication |

## 📋 Development Planning

Comprehensive roadmap and task management for FairShare development.

| File | Description |
|------|-------------|
| [Development Roadmap](./TODO.md) | Complete feature roadmap organized by priority |
| [Quick Wins](./QUICK_WINS.md) | High-impact, low-effort tasks for immediate implementation |

## 📱 Application Overview

FairShare is a modern expense-sharing application built with:

- **Framework**: Next.js 15.5.2 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Auth.js v5 with WebAuthn support
- **Styling**: Tailwind CSS with custom design system
- **Typography**: Geist font family

### Key Features

- 🔐 **Secure Authentication** - Password and passwordless (WebAuthn) login
- 💰 **Expense Tracking** - Track and split shared expenses (planned)
- 👥 **Group Management** - Organize expenses by groups (planned)
- 📱 **Responsive Design** - Works on all device sizes
- ♿ **Accessibility** - WCAG compliant design system

### Current Implementation Status

| Feature | Status |
|---------|--------|
| User Authentication | ✅ Complete |
| WebAuthn (Passkey) Support | ✅ Complete |
| Account Management | ✅ Complete |
| Design System | ✅ Complete |
| Expense Management | 🚧 Planned |
| Group Management | 🚧 Planned |
| Settlement System | 🚧 Planned |

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Start development server
pnpm dev
```

## 🛠 Contributing

When contributing to FairShare:

1. Follow the established design system patterns
2. Update documentation for any changes
3. Test across different devices and browsers
4. Ensure accessibility compliance
5. Maintain consistent code quality

## 📱 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Responsive**: Mobile-first approach with progressive enhancement

---

_Last updated: August 28, 2025_
