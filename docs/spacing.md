# Spacing

The FairShare spacing system provides consistent rhythm and hierarchy throughout the interface using an 8-pixel base unit that scales harmoniously across all design elements.

## 📐 Spacing Scale

### Base Unit: 8px (0.5rem)

All spacing follows multiples of 8px for visual consistency and alignment with common screen densities.

| Token | Tailwind Class | CSS Value | Pixels | Usage                |
| ----- | -------------- | --------- | ------ | -------------------- |
| 0     | `p-0`, `m-0`   | 0         | 0px    | No spacing           |
| 1     | `p-1`, `m-1`   | 0.25rem   | 4px    | Tight spacing, icons |
| 2     | `p-2`, `m-2`   | 0.5rem    | 8px    | Small gaps           |
| 3     | `p-3`, `m-3`   | 0.75rem   | 12px   | Form elements        |
| 4     | `p-4`, `m-4`   | 1rem      | 16px   | Standard spacing     |
| 5     | `p-5`, `m-5`   | 1.25rem   | 20px   | Medium spacing       |
| 6     | `p-6`, `m-6`   | 1.5rem    | 24px   | Card padding         |
| 8     | `p-8`, `m-8`   | 2rem      | 32px   | Section spacing      |
| 10    | `p-10`, `m-10` | 2.5rem    | 40px   | Large spacing        |
| 12    | `p-12`, `m-12` | 3rem      | 48px   | Extra large          |
| 16    | `p-16`, `m-16` | 4rem      | 64px   | Section padding      |
| 20    | `p-20`, `m-20` | 5rem      | 80px   | Page sections        |
| 24    | `p-24`, `m-24` | 6rem      | 96px   | Hero spacing         |

## 🏗️ Layout Spacing

### Container Widths

```css
/* Max-width containers */
.container-sm {
  max-width: 640px;
} /* Small screens */
.container-md {
  max-width: 768px;
} /* Medium screens */
.container-lg {
  max-width: 1024px;
} /* Large screens */
.container-xl {
  max-width: 1280px;
} /* Extra large */
.container-2xl {
  max-width: 1536px;
} /* 2X large */

/* FairShare primary container */
.container-main {
  max-width: 1280px;
  margin: 0 auto;
}
```

### Page Padding

```css
/* Horizontal page padding */
.px-page {
  padding-left: 1rem; /* 16px mobile */
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .px-page {
    padding-left: 1.5rem; /* 24px tablet */
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .px-page {
    padding-left: 2rem; /* 32px desktop */
    padding-right: 2rem;
  }
}
```

### Section Spacing

```css
/* Vertical section spacing */
.section-sm {
  padding-top: 3rem;
  padding-bottom: 3rem;
} /* 48px */
.section-md {
  padding-top: 5rem;
  padding-bottom: 5rem;
} /* 80px */
.section-lg {
  padding-top: 6rem;
  padding-bottom: 6rem;
} /* 96px */
.section-xl {
  padding-top: 8rem;
  padding-bottom: 8rem;
} /* 128px */
```

## 🎴 Component Spacing

### Cards & Containers

```css
/* Card padding standards */
.card-sm {
  padding: 1rem;
} /* 16px - compact cards */
.card-md {
  padding: 1.5rem;
} /* 24px - standard cards */
.card-lg {
  padding: 2rem;
} /* 32px - feature cards */
.card-xl {
  padding: 2.5rem;
} /* 40px - hero cards */

/* Card gaps */
.card-gap-sm {
  gap: 1rem;
} /* 16px between cards */
.card-gap-md {
  gap: 1.5rem;
} /* 24px between cards */
.card-gap-lg {
  gap: 2rem;
} /* 32px between cards */
```

### Form Elements

```css
/* Form spacing */
.form-group {
  margin-bottom: 1.5rem; /* 24px between form groups */
}

.form-input {
  padding: 0.75rem 1rem; /* 12px top/bottom, 16px left/right */
}

.form-label {
  margin-bottom: 0.5rem; /* 8px below labels */
}

.form-help {
  margin-top: 0.25rem; /* 4px above help text */
}
```

### Navigation

```css
/* Navigation spacing */
.nav-item {
  padding: 0.5rem 1rem; /* 8px top/bottom, 16px left/right */
}

.nav-gap {
  gap: 2rem; /* 32px between nav items */
}

.nav-brand {
  margin-right: 2rem; /* 32px after brand */
}
```

## 🔲 Button Spacing

### Button Padding

```css
/* Button size variants */
.btn-sm {
  padding: 0.5rem 1rem; /* 8px 16px */
  font-size: 0.875rem; /* 14px */
}

.btn-md {
  padding: 0.75rem 1.5rem; /* 12px 24px */
  font-size: 1rem; /* 16px */
}

.btn-lg {
  padding: 1rem 2rem; /* 16px 32px */
  font-size: 1.125rem; /* 18px */
}

.btn-xl {
  padding: 1rem 2rem; /* 16px 32px */
  font-size: 1.25rem; /* 20px */
}
```

### Button Groups

```css
/* Button group spacing */
.btn-group {
  gap: 1rem; /* 16px between buttons */
}

.btn-group-sm {
  gap: 0.5rem; /* 8px for compact groups */
}

.btn-group-lg {
  gap: 1.5rem; /* 24px for spread out groups */
}
```

## 📱 Responsive Spacing

### Mobile-First Approach

```css
/* Base mobile spacing */
.responsive-section {
  padding: 3rem 1rem;
}

/* Tablet adjustments */
@media (min-width: 768px) {
  .responsive-section {
    padding: 4rem 1.5rem;
  }
}

/* Desktop adjustments */
@media (min-width: 1024px) {
  .responsive-section {
    padding: 5rem 2rem;
  }
}

/* Large desktop */
@media (min-width: 1280px) {
  .responsive-section {
    padding: 6rem 2rem;
  }
}
```

### Responsive Utilities

```html
<!-- Responsive padding -->
<div class="p-4 md:p-6 lg:p-8">Content</div>

<!-- Responsive margins -->
<div class="mb-8 md:mb-12 lg:mb-16">Section</div>

<!-- Responsive gaps -->
<div class="space-y-4 md:space-y-6 lg:space-y-8">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## 🎯 Usage Guidelines

### Text Spacing

```css
/* Typography spacing */
.text-spacing {
  /* Headings */
  margin-bottom: 1rem; /* 16px after h1-h6 */

  /* Paragraphs */
  margin-bottom: 1.5rem; /* 24px after paragraphs */

  /* Lists */
  margin-bottom: 1.5rem; /* 24px after lists */

  /* List items */
  margin-bottom: 0.5rem; /* 8px between list items */
}
```

### Grid Spacing

```css
/* Grid systems */
.grid-tight {
  gap: 1rem;
} /* 16px grid gap */
.grid-normal {
  gap: 1.5rem;
} /* 24px grid gap */
.grid-loose {
  gap: 2rem;
} /* 32px grid gap */
.grid-wide {
  gap: 3rem;
} /* 48px grid gap */
```

### Content Spacing

```css
/* Content organization */
.content-block {
  margin-bottom: 2rem; /* 32px between content blocks */
}

.content-section {
  margin-bottom: 4rem; /* 64px between major sections */
}

.content-group {
  margin-bottom: 1rem; /* 16px between related items */
}
```

## 🧩 Component Examples

### Hero Section

```html
<section class="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <!-- Content with proper spacing -->
    </div>
  </div>
</section>
```

### Feature Grid

```html
<section class="py-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="mb-4">Features</h2>
      <p class="mb-8">Description</p>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
      <!-- Feature cards -->
    </div>
  </div>
</section>
```

### Card Component

```html
<div class="bg-white rounded-xl shadow-lg p-8 space-y-6">
  <div class="text-center space-y-4">
    <div class="w-16 h-16 mx-auto mb-4">
      <!-- Icon -->
    </div>
    <h3 class="mb-2">Title</h3>
    <p>Description</p>
  </div>
  <div class="space-y-4">
    <!-- List items with consistent spacing -->
  </div>
  <button class="w-full">Action</button>
</div>
```

## 📏 Design Tokens

### CSS Custom Properties

```css
:root {
  /* Spacing scale */
  --space-0: 0;
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
  --space-20: 5rem; /* 80px */
  --space-24: 6rem; /* 96px */

  /* Layout spacing */
  --layout-xs: 1rem; /* 16px */
  --layout-sm: 1.5rem; /* 24px */
  --layout-md: 2rem; /* 32px */
  --layout-lg: 3rem; /* 48px */
  --layout-xl: 4rem; /* 64px */
  --layout-2xl: 5rem; /* 80px */

  /* Component spacing */
  --card-padding: 2rem;
  --section-padding: 5rem;
  --container-padding: 2rem;
}
```

### Utility Classes

```css
/* Custom spacing utilities */
.space-content > * + * {
  margin-top: 1.5rem;
}

.space-section > * + * {
  margin-top: 4rem;
}

.space-list > * + * {
  margin-top: 0.5rem;
}
```

## ♿ Accessibility

### Touch Targets

- **Minimum touch target**: 44px × 44px
- **Recommended**: 48px × 48px
- **Spacing between targets**: 8px minimum

### Focus States

```css
.focus-spacing {
  /* Ensure adequate spacing for focus rings */
  margin: 2px;

  /* Focus ring offset */
  outline-offset: 2px;
}
```

### Reading Flow

- **Line spacing**: 1.5× font size minimum
- **Paragraph spacing**: 1.5rem minimum
- **Section spacing**: 3rem minimum
- **Content width**: 65ch maximum for readability

---

_Last updated: August 28, 2025_
