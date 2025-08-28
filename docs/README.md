# FairShare Documentation

Complete documentation for the FairShare expense-sharing application, including setup guides, design system, and troubleshooting.

## 📖 Table of Contents

- [🎨 Design System](#-design-system)
- [⚙️ Setup & Implementation](#%EF%B8%8F-setup--implementation)
- [🔧 Troubleshooting](#-troubleshooting)
- [📱 Application Overview](#-application-overview)

## � Design System

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

## 📱 Application Overview

FairShare is a modern expense-sharing application built with:

- **Framework**: Next.js 15.5.2 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Auth.js v5 with WebAuthn support
- **Styling**: Tailwind CSS with custom design system
- **Typography**: Geist font family

### Key Features

- 🔐 **Secure Authentication** - Password and passwordless (WebAuthn) login
- 💰 **Expense Tracking** - Track and split shared expenses
- 👥 **Group Management** - Organize expenses by groups
- 📱 **Responsive Design** - Works on all device sizes
- ♿ **Accessibility** - WCAG compliant design system

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Start development server
pnpm dev
```
| [Animation](./animation.md)   | Motion design and interaction patterns             |

## 🧩 Components

### Core Components

- **Navigation** - Headers, menus, breadcrumbs
- **Buttons** - Primary, secondary, and utility actions
- **Forms** - Inputs, validation, and form layouts
- **Cards** - Content containers and information display
- **Modals** - Overlays, dialogs, and confirmations

### Application Components

- **Expense Cards** - Expense display and management
- **User Avatars** - Profile pictures and user representation
- **Group Management** - Group creation and member handling
- **Payment Status** - Transaction states and progress

## 🎨 Design Tokens

Design tokens are the atomic elements of the design system:

```css
/* Example tokens */
--color-primary-600: #059669;
--color-gray-900: #111827;
--font-display: "Geist", "Inter", system-ui, sans-serif;
--spacing-4: 1rem;
--border-radius-lg: 0.5rem;
```

## 🛠 Contributing

When contributing to the design system:

1. Follow established patterns and conventions
2. Update documentation for any changes
3. Test across different devices and browsers
4. Ensure accessibility compliance
5. Maintain design token consistency

## 📱 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Responsive**: Mobile-first approach with progressive enhancement

---

_Last updated: August 28, 2025_
