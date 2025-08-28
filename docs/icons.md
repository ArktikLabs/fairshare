# Icons

The FairShare icon system uses a combination of emoji icons and SVG icons to create a friendly, accessible, and consistent visual language throughout the application.

## 🎨 Icon Strategy

### Primary Approach: Emoji Icons

We primarily use emoji icons for their:

- **Universal recognition** - Instantly understood across cultures
- **Accessibility** - Built-in screen reader support
- **Consistency** - Uniform appearance across platforms
- **Performance** - No additional asset loading required
- **Friendliness** - Creates approachable, human interface

### Secondary Approach: SVG Icons

SVG icons are used for:

- **Interface elements** - Navigation, controls, states
- **Brand consistency** - Custom iconography
- **Scalability** - Perfect rendering at any size
- **Customization** - Precise control over appearance

## 📱 Emoji Icon Library

### Financial & Money

```
💰 - Money/Currency (primary financial icon)
💵 - Dollar Bills (US currency specific)
💳 - Credit Card (payment methods)
🏦 - Bank (banking/financial institutions)
💎 - Diamond (premium/valuable)
💸 - Money with Wings (spending/expenses)
🪙 - Coin (currency/money)
```

### Groups & People

```
👥 - People (groups/sharing)
👤 - Person (individual user)
🤝 - Handshake (agreements/partnerships)
👨‍👩‍👧‍👦 - Family (family groups)
🎭 - Masks (different personas/roles)
```

### Activities & Categories

```
🍕 - Food (dining expenses)
🏠 - House (housing/rent)
🚗 - Car (transportation)
✈️ - Airplane (travel)
🎬 - Movie (entertainment)
🛒 - Shopping Cart (purchases)
🎯 - Target (goals/objectives)
📊 - Chart (analytics/reports)
📈 - Trending Up (growth/positive)
📉 - Trending Down (decrease/negative)
```

### Interface & Actions

```
✅ - Check Mark (completed/success)
❌ - Cross Mark (error/remove)
⚠️ - Warning (alerts/caution)
ℹ️ - Information (help/info)
⚙️ - Gear (settings)
🔄 - Refresh (update/sync)
📱 - Mobile Phone (mobile app)
🔍 - Magnifying Glass (search)
📤 - Outbox Tray (send/upload)
📥 - Inbox Tray (receive/download)
```

### Status & States

```
🟢 - Green Circle (active/online)
🔴 - Red Circle (inactive/error)
🟡 - Yellow Circle (warning/pending)
⭐ - Star (favorites/ratings)
🔒 - Lock (secure/private)
🔓 - Unlock (public/accessible)
```

## 🎯 Icon Usage Guidelines

### Size Standards

```css
/* Icon size classes */
.icon-xs {
  font-size: 0.75rem;
} /* 12px */
.icon-sm {
  font-size: 1rem;
} /* 16px */
.icon-md {
  font-size: 1.25rem;
} /* 20px */
.icon-lg {
  font-size: 1.5rem;
} /* 24px */
.icon-xl {
  font-size: 2rem;
} /* 32px */
.icon-2xl {
  font-size: 2.5rem;
} /* 40px */
.icon-3xl {
  font-size: 3rem;
} /* 48px */
```

### Contextual Usage

#### Navigation Icons

```html
<!-- Features section -->
<span class="text-2xl">📊</span>
<span class="text-2xl">🎯</span>

<!-- How it works steps -->
<span class="text-3xl">📱</span>
<!-- Add Expenses -->
<span class="text-3xl">👥</span>
<!-- Share with Friends -->
<span class="text-3xl">⚖️</span>
<!-- Settle Fairly -->
```

#### Feature Cards

```html
<div
  class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4"
>
  <span class="text-xl">📊</span>
</div>
```

#### Status Indicators

```html
<!-- Payment status -->
<span class="text-green-500">✅</span> Paid
<span class="text-yellow-500">⚠️</span> Pending
<span class="text-red-500">❌</span> Overdue
```

#### Category Icons

```html
<!-- Expense categories -->
<div class="expense-category">
  <span class="text-lg">🍕</span>
  <span>Food & Dining</span>
</div>

<div class="expense-category">
  <span class="text-lg">✈️</span>
  <span>Travel</span>
</div>
```

## 🖼️ SVG Icon System

### Custom SVG Icons

For interface elements that need precise control:

#### Close Icon

```html
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    d="M6 18L18 6M6 6l12 12"
  />
</svg>
```

#### Menu Icon

```html
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    d="M4 6h16M4 12h16M4 18h16"
  />
</svg>
```

#### Chevron Icons

```html
<!-- Chevron Down -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    d="M19 9l-7 7-7-7"
  />
</svg>

<!-- Chevron Right -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    d="M9 5l7 7-7 7"
  />
</svg>
```

### SVG Icon Classes

```css
/* Base SVG icon styles */
.icon-svg {
  display: inline-block;
  vertical-align: middle;
  fill: currentColor;
  flex-shrink: 0;
}

/* Interactive SVG icons */
.icon-interactive {
  transition: all 0.2s ease;
  cursor: pointer;
}

.icon-interactive:hover {
  transform: scale(1.1);
  opacity: 0.8;
}
```

## 📐 Icon Spacing & Layout

### Icon with Text

```html
<!-- Horizontal layout -->
<div class="flex items-center space-x-2">
  <span class="text-lg">📊</span>
  <span>Analytics</span>
</div>

<!-- Vertical layout -->
<div class="text-center">
  <div class="text-3xl mb-2">💰</div>
  <div class="text-sm">Expenses</div>
</div>
```

### Icon Containers

```html
<!-- Circular container -->
<div
  class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"
>
  <span class="text-xl">📱</span>
</div>

<!-- Square container -->
<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
  <span class="text-xl">💰</span>
</div>

<!-- Large feature container -->
<div
  class="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6"
>
  <span class="text-3xl">⚖️</span>
</div>
```

## 🎨 Icon Color System

### Semantic Colors

```css
/* Success icons */
.icon-success {
  color: #22c55e;
}

/* Warning icons */
.icon-warning {
  color: #f59e0b;
}

/* Error icons */
.icon-error {
  color: #ef4444;
}

/* Info icons */
.icon-info {
  color: #3b82f6;
}

/* Neutral icons */
.icon-neutral {
  color: #6b7280;
}
```

### Background Colors

```css
/* Icon background containers */
.icon-bg-success {
  background-color: #dcfce7;
}
.icon-bg-warning {
  background-color: #fef3c7;
}
.icon-bg-error {
  background-color: #fee2e2;
}
.icon-bg-info {
  background-color: #dbeafe;
}
.icon-bg-neutral {
  background-color: #f3f4f6;
}
```

## 📱 Responsive Icons

### Mobile Optimization

```html
<!-- Responsive icon sizes -->
<span class="text-lg md:text-xl lg:text-2xl">💰</span>

<!-- Responsive containers -->
<div
  class="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 bg-green-100 rounded-lg flex items-center justify-center"
>
  <span class="text-base md:text-lg lg:text-xl">📊</span>
</div>
```

### Touch Target Guidelines

```css
/* Minimum touch target for mobile */
.icon-touch {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

## ♿ Accessibility

### Screen Reader Support

```html
<!-- Decorative icons (hidden from screen readers) -->
<span aria-hidden="true">💰</span>

<!-- Meaningful icons (with text alternative) -->
<span role="img" aria-label="Money">💰</span>

<!-- Icons with descriptive text -->
<div>
  <span aria-hidden="true">✅</span>
  <span class="sr-only">Payment completed</span>
  <span>Paid</span>
</div>
```

### Alternative Text

```html
<!-- SVG with proper accessibility -->
<svg aria-labelledby="close-icon-title" role="img">
  <title id="close-icon-title">Close dialog</title>
  <!-- SVG content -->
</svg>

<!-- Icon buttons with labels -->
<button aria-label="Close menu">
  <span aria-hidden="true">❌</span>
</button>
```

## 🔄 Icon Animation

### Hover Effects

```css
/* Subtle hover animation */
.icon-hover {
  transition: transform 0.2s ease;
}

.icon-hover:hover {
  transform: scale(1.1);
}

/* Rotation animation */
.icon-rotate:hover {
  transform: rotate(15deg);
}
```

### Loading Animations

```css
/* Spinning loading icon */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.icon-spin {
  animation: spin 1s linear infinite;
}
```

## 📚 Implementation Examples

### Feature Section Icons

```html
<div class="grid md:grid-cols-3 gap-8">
  <div class="text-center group">
    <div
      class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors"
    >
      <span class="text-3xl">📱</span>
    </div>
    <h3 class="text-xl font-semibold mb-3">Add Expenses</h3>
    <p class="text-gray-600">
      Quickly add shared expenses with photos and details.
    </p>
  </div>
</div>
```

### Navigation with Icons

```html
<nav class="flex items-center space-x-6">
  <a
    href="/dashboard"
    class="flex items-center space-x-2 text-gray-600 hover:text-green-600"
  >
    <span>📊</span>
    <span>Dashboard</span>
  </a>
  <a
    href="/groups"
    class="flex items-center space-x-2 text-gray-600 hover:text-green-600"
  >
    <span>👥</span>
    <span>Groups</span>
  </a>
  <a
    href="/settings"
    class="flex items-center space-x-2 text-gray-600 hover:text-green-600"
  >
    <span>⚙️</span>
    <span>Settings</span>
  </a>
</nav>
```

### Status Icons

```html
<div class="expense-status">
  <div class="flex items-center space-x-2">
    <span class="text-green-500">✅</span>
    <span class="text-sm text-green-700">Payment Received</span>
  </div>
</div>
```

---

_Last updated: August 28, 2025_
