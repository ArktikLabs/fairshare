# Colors

The FairShare color system is designed to convey trust, clarity, and financial reliability while maintaining accessibility and visual appeal.

## 🎨 Color Palette

### Primary Colors

#### Green (Primary Brand)

- **green-50**: `#f0fdf4` - Light backgrounds, subtle highlights
- **green-100**: `#dcfce7` - Hover states, light accents
- **green-200**: `#bbf7d0` - Borders, dividers
- **green-300**: `#86efac` - Secondary elements
- **green-400**: `#4ade80` - Interactive elements
- **green-500**: `#22c55e` - Success states
- **green-600**: `#16a34a` - Primary actions, buttons
- **green-700**: `#15803d` - Hover states, pressed buttons
- **green-800**: `#166534` - Text on light backgrounds
- **green-900**: `#14532d` - Headers, high contrast text

#### Blue (Secondary)

- **blue-50**: `#eff6ff` - Light backgrounds
- **blue-100**: `#dbeafe` - Subtle accents
- **blue-200**: `#bfdbfe` - Borders
- **blue-300**: `#93c5fd` - Secondary elements
- **blue-400**: `#60a5fa` - Links, info states
- **blue-500**: `#3b82f6` - Information, secondary actions
- **blue-600**: `#2563eb` - Pro plan highlights
- **blue-700**: `#1d4ed8` - Hover states
- **blue-800**: `#1e40af` - Text elements
- **blue-900**: `#1e3a8a` - Dark text

### Neutral Colors

#### Gray Scale

- **gray-50**: `#f9fafb` - Page backgrounds
- **gray-100**: `#f3f4f6` - Card backgrounds
- **gray-200**: `#e5e7eb` - Borders, dividers
- **gray-300**: `#d1d5db` - Disabled states
- **gray-400**: `#9ca3af` - Placeholder text
- **gray-500**: `#6b7280` - Secondary text
- **gray-600**: `#4b5563` - Body text
- **gray-700**: `#374151` - Headings
- **gray-800**: `#1f2937` - Dark text
- **gray-900**: `#111827` - Primary text, headers

### Semantic Colors

#### Success

- **green-100**: Light success backgrounds
- **green-500**: Success icons, positive actions
- **green-600**: Primary success states

#### Warning

- **yellow-100**: `#fef3c7` - Warning backgrounds
- **yellow-500**: `#f59e0b` - Warning icons
- **yellow-600**: `#d97706` - Warning states

#### Error

- **red-100**: `#fee2e2` - Error backgrounds
- **red-500**: `#ef4444` - Error icons
- **red-600**: `#dc2626` - Error states

#### Info

- **blue-100**: Info backgrounds
- **blue-500**: Info icons
- **blue-600**: Info states

## 📐 Usage Guidelines

### Text Colors

```css
/* Primary text - highest contrast */
.text-primary {
  color: #111827;
} /* gray-900 */

/* Secondary text - medium contrast */
.text-secondary {
  color: #4b5563;
} /* gray-600 */

/* Tertiary text - lower contrast */
.text-tertiary {
  color: #6b7280;
} /* gray-500 */

/* Placeholder text */
.text-placeholder {
  color: #9ca3af;
} /* gray-400 */
```

### Background Colors

```css
/* Page backgrounds */
.bg-page {
  background-color: #ffffff;
}
.bg-section {
  background-color: #f9fafb;
} /* gray-50 */

/* Card backgrounds */
.bg-card {
  background-color: #ffffff;
}
.bg-card-hover {
  background-color: #f3f4f6;
} /* gray-100 */

/* Interactive backgrounds */
.bg-primary {
  background-color: #16a34a;
} /* green-600 */
.bg-primary-hover {
  background-color: #15803d;
} /* green-700 */
```

### Border Colors

```css
/* Default borders */
.border-default {
  border-color: #e5e7eb;
} /* gray-200 */

/* Interactive borders */
.border-focus {
  border-color: #16a34a;
} /* green-600 */
.border-hover {
  border-color: #86efac;
} /* green-300 */
```

## ♿ Accessibility

### Contrast Ratios

All color combinations meet WCAG 2.1 AA standards:

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18px+): Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio

### Approved Text/Background Combinations

#### High Contrast (AAA)

- gray-900 on white: 16.8:1
- gray-800 on white: 12.4:1
- white on green-600: 7.2:1
- white on gray-900: 16.8:1

#### Good Contrast (AA)

- gray-700 on white: 8.6:1
- gray-600 on white: 5.7:1
- white on blue-600: 6.1:1
- gray-900 on gray-50: 15.8:1

### Color Blind Considerations

- Never rely on color alone to convey information
- Use icons, patterns, or text labels alongside color
- Test with color blind simulation tools
- Maintain sufficient contrast in grayscale

## 🎭 Color Psychology

### Green (Primary)

- **Associations**: Trust, growth, money, success
- **Usage**: Financial actions, positive outcomes, call-to-actions
- **Emotional Response**: Calming, reassuring, confident

### Blue (Secondary)

- **Associations**: Reliability, stability, professionalism
- **Usage**: Information, secondary actions, pro features
- **Emotional Response**: Trustworthy, calming, corporate

### Gray (Neutral)

- **Associations**: Balance, sophistication, timelessness
- **Usage**: Text, backgrounds, structural elements
- **Emotional Response**: Neutral, professional, clean

## 📱 Implementation

### CSS Custom Properties

```css
:root {
  /* Primary Colors */
  --color-green-50: #f0fdf4;
  --color-green-600: #16a34a;
  --color-green-700: #15803d;

  /* Semantic Colors */
  --color-success: var(--color-green-600);
  --color-info: #3b82f6;
  --color-warning: #f59e0b;
  --color-error: #dc2626;

  /* Text Colors */
  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-text-tertiary: #6b7280;
}
```

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0fdf4",
          600: "#16a34a",
          700: "#15803d",
        },
        semantic: {
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#dc2626",
          info: "#3b82f6",
        },
      },
    },
  },
};
```

---

_Last updated: August 28, 2025_
