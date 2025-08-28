# Layout

The FairShare layout system provides a flexible, responsive grid framework designed for modern expense-sharing interfaces, ensuring optimal user experience across all devices and screen sizes.

## 📐 Grid System

### CSS Grid Foundation

FairShare uses CSS Grid as the primary layout method, complemented by Flexbox for component-level layouts.

```css
/* Base grid container */
.grid-container {
  display: grid;
  gap: 1.5rem; /* 24px default gap */
}

/* Responsive grid columns */
.grid-responsive {
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .grid-responsive {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-responsive {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Tailwind Grid Classes

```html
<!-- Basic responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Grid items -->
</div>

<!-- Feature grid -->
<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
  <!-- Feature cards -->
</div>

<!-- Two-column layout -->
<div class="grid lg:grid-cols-2 gap-12 items-center">
  <!-- Content and image -->
</div>
```

## 📱 Responsive Breakpoints

### Breakpoint System

```css
/* Mobile First Breakpoints */
@media (min-width: 640px) {
  /* sm: Small tablets */
}
@media (min-width: 768px) {
  /* md: Tablets */
}
@media (min-width: 1024px) {
  /* lg: Desktop */
}
@media (min-width: 1280px) {
  /* xl: Large desktop */
}
@media (min-width: 1536px) {
  /* 2xl: Extra large */
}
```

### Responsive Design Patterns

```html
<!-- Mobile-first responsive text -->
<h1 class="text-4xl md:text-5xl lg:text-7xl">Responsive Heading</h1>

<!-- Responsive spacing -->
<section class="py-12 md:py-16 lg:py-20">Content</section>

<!-- Responsive grid -->
<div
  class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8"
>
  <!-- Items -->
</div>
```

## 🏗️ Container System

### Container Widths

```css
/* Container size options */
.container-sm {
  max-width: 640px;
} /* Small content */
.container-md {
  max-width: 768px;
} /* Medium content */
.container-lg {
  max-width: 1024px;
} /* Large content */
.container-xl {
  max-width: 1280px;
} /* Extra large */
.container-2xl {
  max-width: 1536px;
} /* Maximum width */

/* Full-width container */
.container-full {
  max-width: 100%;
}

/* FairShare standard container */
.container-main {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .container-main {
    padding: 0 1.5rem;
  }
}

@media (min-width: 1024px) {
  .container-main {
    padding: 0 2rem;
  }
}
```

### Implementation

```html
<!-- Standard page container -->
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Page content -->
</div>

<!-- Narrow content container -->
<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Article or form content -->
</div>

<!-- Wide feature container -->
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Feature sections -->
</div>
```

## 📄 Page Layout Patterns

### Standard Page Layout

```html
<!DOCTYPE html>
<html>
  <body>
    <!-- Fixed Navigation -->
    <nav class="fixed top-0 w-full z-50">
      <!-- Navigation content -->
    </nav>

    <!-- Main Content -->
    <main class="pt-16">
      <!-- Hero Section -->
      <section class="pt-24 pb-20">
        <!-- Hero content -->
      </section>

      <!-- Content Sections -->
      <section class="py-20">
        <!-- Section content -->
      </section>
    </main>

    <!-- Footer -->
    <footer class="py-16">
      <!-- Footer content -->
    </footer>
  </body>
</html>
```

### Dashboard Layout

```html
<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header content -->
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <!-- Dashboard grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Sidebar -->
      <div class="lg:col-span-1">
        <!-- Sidebar content -->
      </div>

      <!-- Main content -->
      <div class="lg:col-span-2">
        <!-- Main dashboard content -->
      </div>
    </div>
  </main>
</div>
```

## 🎯 Section Layouts

### Hero Section

```html
<section
  class="pt-24 pb-20 bg-gradient-to-br from-blue-50 via-white to-green-50"
>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <!-- Text Content -->
      <div class="text-center lg:text-left">
        <h1 class="text-5xl lg:text-7xl font-display mb-6">
          Split expenses, share fairly
        </h1>
        <p class="text-xl lg:text-2xl text-gray-600 mb-8">
          The simplest way to track shared expenses.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- CTAs -->
        </div>
      </div>

      <!-- Visual Content -->
      <div class="relative">
        <!-- Expense card mockup -->
      </div>
    </div>
  </div>
</section>
```

### Feature Grid Section

```html
<section class="py-20 bg-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Section Header -->
    <div class="text-center mb-16">
      <h2 class="text-4xl lg:text-5xl font-display mb-4">
        Everything You Need
      </h2>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">
        Powerful features for expense sharing
      </p>
    </div>

    <!-- Feature Grid -->
    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
      <!-- Feature cards -->
    </div>
  </div>
</section>
```

### Split Content Section

```html
<section class="py-20 bg-gradient-to-br from-green-50 to-blue-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <!-- Text Content -->
      <div>
        <h2 class="text-4xl lg:text-5xl font-display mb-6">
          Why Choose FairShare?
        </h2>
        <div class="space-y-6">
          <!-- Benefits list -->
        </div>
      </div>

      <!-- Visual Content -->
      <div class="relative">
        <!-- Supporting visual -->
      </div>
    </div>
  </div>
</section>
```

## 🔧 Flexbox Layouts

### Navigation Layout

```html
<nav class="flex justify-between items-center h-16">
  <!-- Brand -->
  <div class="flex items-center">
    <h1 class="text-2xl font-display">FairShare</h1>
  </div>

  <!-- Navigation Links -->
  <div class="hidden md:flex items-center space-x-8">
    <a href="#">Features</a>
    <a href="#">Pricing</a>
    <button>Sign In</button>
  </div>
</nav>
```

### Card Layout

```html
<div class="flex flex-col h-full">
  <!-- Card Header -->
  <div class="flex items-center mb-4">
    <!-- Header content -->
  </div>

  <!-- Card Body (grows to fill space) -->
  <div class="flex-1">
    <!-- Main content -->
  </div>

  <!-- Card Footer -->
  <div class="mt-auto">
    <!-- Footer content -->
  </div>
</div>
```

### Form Layout

```html
<form class="space-y-6">
  <!-- Form fields with consistent spacing -->
  <div>
    <label class="block mb-2">Name</label>
    <input class="w-full" />
  </div>

  <!-- Button group -->
  <div class="flex flex-col sm:flex-row gap-4">
    <button class="flex-1">Submit</button>
    <button class="flex-1">Cancel</button>
  </div>
</form>
```

## 📐 Spacing & Alignment

### Vertical Spacing

```css
/* Section spacing */
.section-spacing {
  padding-top: 5rem; /* 80px */
  padding-bottom: 5rem; /* 80px */
}

/* Content spacing */
.content-spacing > * + * {
  margin-top: 1.5rem; /* 24px between elements */
}

/* Large spacing */
.large-spacing {
  margin-bottom: 4rem; /* 64px */
}
```

### Horizontal Spacing

```css
/* Container padding */
.container-padding {
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .container-padding {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

/* Element spacing */
.element-spacing > * + * {
  margin-left: 1rem; /* 16px between inline elements */
}
```

### Alignment Utilities

```html
<!-- Center alignment -->
<div class="flex items-center justify-center">Centered content</div>

<!-- Text alignment -->
<div class="text-center lg:text-left">Responsive text alignment</div>

<!-- Vertical alignment -->
<div class="flex items-start">Top aligned items</div>
```

## 🎨 Layout Components

### Card Grid

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div class="bg-white rounded-xl shadow-lg p-6">
    <!-- Card content -->
  </div>
</div>
```

### Sidebar Layout

```html
<div class="flex flex-col lg:flex-row gap-8">
  <!-- Sidebar -->
  <aside class="lg:w-1/4">
    <!-- Sidebar content -->
  </aside>

  <!-- Main Content -->
  <main class="lg:w-3/4">
    <!-- Main content -->
  </main>
</div>
```

### Modal Layout

```html
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-black bg-opacity-50"></div>

  <!-- Modal -->
  <div class="relative bg-white rounded-xl max-w-md w-full p-6">
    <!-- Modal content -->
  </div>
</div>
```

## 📱 Mobile Layout Considerations

### Mobile-First Design

```css
/* Base mobile styles */
.mobile-layout {
  padding: 1rem;
  font-size: 1rem;
}

/* Tablet enhancements */
@media (min-width: 768px) {
  .mobile-layout {
    padding: 1.5rem;
    font-size: 1.125rem;
  }
}

/* Desktop optimizations */
@media (min-width: 1024px) {
  .mobile-layout {
    padding: 2rem;
    font-size: 1.25rem;
  }
}
```

### Touch-Friendly Spacing

```css
/* Minimum touch targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem;
}

/* Increased spacing for mobile */
.mobile-spacing {
  gap: 1rem;
}

@media (min-width: 768px) {
  .mobile-spacing {
    gap: 1.5rem;
  }
}
```

## ♿ Accessibility

### Focus Management

```css
/* Skip links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 6px;
}
```

### Semantic HTML

```html
<!-- Proper semantic structure -->
<header>
  <nav aria-label="Main navigation">
    <!-- Navigation -->
  </nav>
</header>

<main>
  <section aria-labelledby="features-heading">
    <h2 id="features-heading">Features</h2>
    <!-- Section content -->
  </section>
</main>

<footer>
  <!-- Footer content -->
</footer>
```

### ARIA Landmarks

```html
<div role="banner">Header content</div>
<div role="navigation">Navigation</div>
<div role="main">Main content</div>
<div role="complementary">Sidebar</div>
<div role="contentinfo">Footer</div>
```

## 🛠 Layout Utilities

### Custom CSS Classes

```css
/* Layout helpers */
.full-height {
  min-height: 100vh;
}
.center-content {
  display: flex;
  align-items: center;
  justify-content: center;
}
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 50;
}

/* Responsive helpers */
.hide-mobile {
  display: none;
}
@media (min-width: 768px) {
  .hide-mobile {
    display: block;
  }
}

.show-mobile {
  display: block;
}
@media (min-width: 768px) {
  .show-mobile {
    display: none;
  }
}
```

---

_Last updated: August 28, 2025_
