# Typography

The FairShare typography system uses the Geist font family to create a modern, readable, and trustworthy visual hierarchy that enhances the user experience across all interfaces.

## 🔤 Font Family

### Primary Typeface: Geist

- **Designer**: Vercel
- **Classification**: Neo-grotesque sans-serif
- **Characteristics**: Clean, modern, highly legible
- **OpenType Features**: Advanced character variants, ligatures
- **Weights Available**: 100-900

### Font Stack

```css
font-family: "Geist", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
  Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Font Loading

```javascript
// Next.js implementation
import { Geist } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
```

## 📏 Type Scale

### Display Scale (Headlines & Important Text)

| Size   | Tailwind Class | CSS Size | Line Height | Letter Spacing | Usage           |
| ------ | -------------- | -------- | ----------- | -------------- | --------------- |
| XL     | `text-7xl`     | 72px     | 0.95        | -0.05em        | Hero headlines  |
| Large  | `text-5xl`     | 48px     | 1.0         | -0.04em        | Section headers |
| Medium | `text-3xl`     | 30px     | 1.1         | -0.03em        | Page titles     |
| Small  | `text-2xl`     | 24px     | 1.2         | -0.025em       | Card titles     |

### Body Scale (Content & Interface)

| Size  | Tailwind Class | CSS Size | Line Height | Letter Spacing | Usage            |
| ----- | -------------- | -------- | ----------- | -------------- | ---------------- |
| Large | `text-xl`      | 20px     | 1.6         | -0.01em        | Lead paragraphs  |
| Base  | `text-base`    | 16px     | 1.6         | -0.01em        | Body text        |
| Small | `text-sm`      | 14px     | 1.5         | 0              | Captions, labels |
| XS    | `text-xs`      | 12px     | 1.4         | 0.025em        | Fine print       |

## 🎭 Typography Classes

### Display Font Class

For headlines, important text, and brand elements:

```css
.font-display {
  font-family: var(--font-geist-sans), "Inter", system-ui, sans-serif;
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: 0.95;
}
```

**Usage Examples:**

- Hero headlines
- Section headers
- Button labels
- Brand elements
- Pricing displays

### Body Font Class

For readable content and interface text:

```css
.font-body {
  font-family: var(--font-geist-sans), "Inter", system-ui, sans-serif;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.6;
}
```

**Usage Examples:**

- Paragraph text
- Descriptions
- Form labels
- Navigation items
- Card content

## 🏷️ Font Weights

| Weight   | Tailwind Class  | CSS Value | Usage                   |
| -------- | --------------- | --------- | ----------------------- |
| Regular  | `font-normal`   | 400       | Body text, descriptions |
| Medium   | `font-medium`   | 500       | Navigation, labels      |
| Semibold | `font-semibold` | 600       | Subheadings, emphasis   |
| Bold     | `font-bold`     | 700       | Headlines, CTAs         |

## 📐 Letter Spacing & Line Height

### Letter Spacing (Tracking)

```css
/* Tight spacing for headlines */
.tracking-tight {
  letter-spacing: -0.025em;
}

/* Very tight for display text */
.tracking-tighter {
  letter-spacing: -0.05em;
}

/* Normal spacing for body text */
.tracking-normal {
  letter-spacing: 0em;
}

/* Wide spacing for small text */
.tracking-wide {
  letter-spacing: 0.025em;
}
```

### Line Height (Leading)

```css
/* Compact for headlines */
.leading-none {
  line-height: 1;
}
.leading-tight {
  line-height: 1.25;
}

/* Comfortable for reading */
.leading-normal {
  line-height: 1.5;
}
.leading-relaxed {
  line-height: 1.625;
}
```

## 🎯 Usage Guidelines

### Headlines Hierarchy

```html
<!-- Page Hero -->
<h1 class="text-7xl font-display tracking-tight text-gray-900">
  Split expenses, share fairly
</h1>

<!-- Section Headers -->
<h2 class="text-5xl font-display tracking-tight text-gray-900">How It Works</h2>

<!-- Subsection Headers -->
<h3 class="text-2xl font-display tracking-tight text-gray-900">Add Expenses</h3>

<!-- Card Titles -->
<h4 class="text-lg font-semibold tracking-tight text-gray-900">
  Group Trip to Bali
</h4>
```

### Body Text

```html
<!-- Lead Paragraphs -->
<p class="text-xl font-body text-gray-600 leading-relaxed">
  The simplest way to track shared expenses...
</p>

<!-- Regular Paragraphs -->
<p class="text-base font-body text-gray-600 leading-normal">
  Create unlimited groups and track expenses...
</p>

<!-- Captions -->
<p class="text-sm text-gray-500">Your spending this month</p>
```

### Interactive Elements

```html
<!-- Primary Buttons -->
<button class="font-display tracking-tight font-semibold">
  Get Started Free
</button>

<!-- Navigation Links -->
<a class="font-medium text-gray-600 hover:text-green-600"> Features </a>

<!-- Form Labels -->
<label class="text-sm font-medium text-gray-700"> Email Address </label>
```

## 📱 Responsive Typography

### Mobile-First Scaling

```css
/* Mobile */
.hero-text {
  font-size: 2.5rem; /* 40px */
  line-height: 1;
}

/* Tablet */
@media (min-width: 768px) {
  .hero-text {
    font-size: 3.5rem; /* 56px */
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .hero-text {
    font-size: 4.5rem; /* 72px */
  }
}
```

### Tailwind Responsive Classes

```html
<!-- Responsive hero text -->
<h1 class="text-4xl md:text-5xl lg:text-7xl font-display">
  Split expenses, share fairly
</h1>

<!-- Responsive body text -->
<p class="text-lg md:text-xl lg:text-2xl font-body">
  The simplest way to track shared expenses
</p>
```

## ♿ Accessibility

### Font Size Guidelines

- **Minimum body text**: 16px (browser default)
- **Minimum interactive elements**: 16px
- **Optimal reading size**: 18-20px
- **Maximum line length**: 65-75 characters

### Contrast Requirements

- **Normal text**: 4.5:1 minimum contrast ratio
- **Large text** (18px+ or 14px+ bold): 3:1 minimum
- **UI components**: 3:1 minimum

### Reading Considerations

```css
/* Optimal reading settings */
.readable-text {
  font-size: 18px;
  line-height: 1.6;
  max-width: 65ch; /* 65 characters */
  color: #374151; /* gray-700 for good contrast */
}
```

## 🛠 Implementation

### CSS Custom Properties

```css
:root {
  /* Font Families */
  --font-display: "Geist", "Inter", system-ui, sans-serif;
  --font-body: "Geist", "Inter", system-ui, sans-serif;

  /* Font Sizes */
  --text-xs: 0.75rem; /* 12px */
  --text-sm: 0.875rem; /* 14px */
  --text-base: 1rem; /* 16px */
  --text-lg: 1.125rem; /* 18px */
  --text-xl: 1.25rem; /* 20px */
  --text-2xl: 1.5rem; /* 24px */
  --text-3xl: 1.875rem; /* 30px */
  --text-4xl: 2.25rem; /* 36px */
  --text-5xl: 3rem; /* 48px */
  --text-6xl: 3.75rem; /* 60px */
  --text-7xl: 4.5rem; /* 72px */

  /* Line Heights */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* Letter Spacing */
  --tracking-tighter: -0.05em;
  --tracking-tight: -0.025em;
  --tracking-normal: 0em;
  --tracking-wide: 0.025em;
}
```

### Global Typography Styles

```css
/* Base typography */
body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: #374151; /* gray-700 */
}

/* Heading defaults */
h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
  color: #111827; /* gray-900 */
}

/* Enhanced typography features */
body {
  font-feature-settings: "cv01", "cv02", "cv03", "cv04";
  font-optical-sizing: auto;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

## 📚 Examples

### Complete Component Examples

#### Hero Section

```html
<section class="pt-24 pb-20">
  <div class="max-w-7xl mx-auto px-4">
    <h1
      class="text-5xl lg:text-7xl font-display text-gray-900 mb-6 leading-none tracking-tight"
    >
      Split expenses,<br />
      <span
        class="text-green-600 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
      >
        share fairly
      </span>
    </h1>
    <p
      class="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed font-body max-w-2xl"
    >
      The simplest way to track shared expenses with friends, family, and
      groups.
    </p>
    <button
      class="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-xl font-display tracking-tight"
    >
      Get Started Free
    </button>
  </div>
</section>
```

#### Feature Card

```html
<div class="p-6 rounded-xl border border-gray-200">
  <h3
    class="text-lg font-semibold text-gray-900 mb-2 font-display tracking-tight"
  >
    Group Expense Tracking
  </h3>
  <p class="text-gray-600 text-sm font-body">
    Create unlimited groups and track all shared expenses in one place.
  </p>
</div>
```

---

_Last updated: August 28, 2025_
