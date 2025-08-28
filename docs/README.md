# FairShare Design System

A comprehensive design system for the FairShare expense-sharing application, built with Next.js, Tailwind CSS, and modern web standards.

## 📖 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Components](#components)
- [Design Tokens](#design-tokens)

## 🎯 Overview

The FairShare Design System provides a unified set of design principles, components, and guidelines to ensure consistency across all user interfaces. It emphasizes:

- **Trust & Transparency** - Clear, honest design that builds user confidence
- **Simplicity** - Intuitive interfaces that make expense sharing effortless
- **Accessibility** - Inclusive design for all users
- **Modern Aesthetics** - Clean, contemporary visual design

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Quick Reference

- **Colors**: Green/Blue palette with neutral grays
- **Typography**: Geist font family with display/body variants
- **Spacing**: 8px base unit (0.5rem increments)
- **Breakpoints**: Mobile-first responsive design

## 📚 Documentation

| Section                       | Description                                        |
| ----------------------------- | -------------------------------------------------- |
| [Colors](./colors.md)         | Color palette, usage guidelines, and accessibility |
| [Typography](./typography.md) | Font system, scales, and text treatments           |
| [Spacing](./spacing.md)       | Layout spacing, padding, margins, and grid         |
| [Components](./components.md) | UI component library and usage                     |
| [Icons](./icons.md)           | Icon system and guidelines                         |
| [Layout](./layout.md)         | Grid system, containers, and responsive design     |
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
