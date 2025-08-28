# Components

The FairShare component library provides a comprehensive set of reusable UI elements designed for consistency, accessibility, and optimal user experience in expense-sharing applications.

## 🧩 Core Components

### Navigation

#### Header Navigation

```html
<nav
  class="fixed top-0 w-full z-50 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-lg"
>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16">
      <!-- Brand -->
      <div class="flex items-center">
        <h1 class="text-2xl font-display tracking-tight text-gray-900">
          Fair<span class="text-green-600">Share</span>
        </h1>
      </div>

      <!-- Navigation Links -->
      <div class="hidden md:flex items-center space-x-8">
        <a
          href="#features"
          class="text-gray-600 hover:text-green-600 transition-colors font-medium"
        >
          Features
        </a>
        <a
          href="#pricing"
          class="text-gray-600 hover:text-green-600 transition-colors font-medium"
        >
          Pricing
        </a>

        <!-- CTA Button -->
        <button
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          Sign In
        </button>
      </div>
    </div>
  </div>
</nav>
```

**Usage Guidelines:**

- Fixed positioning for persistent access
- Backdrop blur for modern glass effect
- Responsive collapse on mobile
- Clear visual hierarchy

#### Mobile Menu

```html
<div class="md:hidden">
  <button class="text-gray-600 hover:text-gray-900 focus:outline-none">
    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  </button>
</div>
```

### Buttons

#### Primary Button

```html
<button
  class="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-display tracking-tight"
>
  Get Started Free
</button>
```

#### Secondary Button

```html
<button
  class="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 font-display tracking-tight"
>
  Learn More
</button>
```

#### Ghost Button

```html
<button
  class="text-gray-600 hover:text-green-600 font-medium px-4 py-2 rounded-lg transition-colors"
>
  Cancel
</button>
```

**Button Sizes:**

```css
/* Small Button */
.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
}

/* Medium Button (Default) */
.btn-md {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 0.75rem;
}

/* Large Button */
.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.125rem;
  border-radius: 0.75rem;
}
```

### Cards

#### Feature Card

```html
<div
  class="p-6 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-300 bg-white"
>
  <!-- Icon -->
  <div
    class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4"
  >
    <span class="text-xl">📊</span>
  </div>

  <!-- Content -->
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

#### Testimonial Card

```html
<div class="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
  <!-- Rating -->
  <div class="flex items-center mb-4">
    <div class="flex text-yellow-400">★★★★★</div>
  </div>

  <!-- Quote -->
  <p class="text-gray-700 mb-4 font-body">
    "FairShare saved our friendship! No more awkward conversations about who
    owes what."
  </p>

  <!-- Author -->
  <div class="flex items-center">
    <div
      class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
    >
      <span class="text-white font-semibold">S</span>
    </div>
    <div class="ml-3">
      <p class="font-semibold text-gray-900">Sarah Johnson</p>
      <p class="text-gray-600 text-sm">Travel Enthusiast</p>
    </div>
  </div>
</div>
```

#### Pricing Card

```html
<div class="bg-white rounded-2xl shadow-lg p-8 border-2 border-green-200">
  <!-- Badge (Optional) -->
  <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
    <span
      class="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold"
    >
      Most Popular
    </span>
  </div>

  <!-- Header -->
  <div class="text-center mb-8">
    <div
      class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4"
    >
      <span class="text-2xl">🎯</span>
    </div>
    <h3
      class="text-2xl font-bold text-gray-900 mb-2 font-display tracking-tight"
    >
      Free Plan
    </h3>
    <div class="text-4xl font-bold text-gray-900 mb-2 font-display">
      $0
      <span class="text-lg font-normal text-gray-600">/month</span>
    </div>
    <p class="text-gray-600 font-body">
      Perfect for personal use and small groups
    </p>
  </div>

  <!-- Features -->
  <ul class="space-y-4 mb-8">
    <li class="flex items-center">
      <span class="text-green-500 mr-3">✓</span>
      <span class="text-gray-700">Up to 3 groups</span>
    </li>
    <!-- More features... -->
  </ul>

  <!-- CTA -->
  <button
    class="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-semibold py-3 rounded-lg transition-colors"
  >
    Start Free
  </button>
</div>
```

### Forms

#### Input Field

```html
<div class="mb-6">
  <label class="block text-sm font-medium text-gray-700 mb-2" for="email">
    Email Address
  </label>
  <input
    type="email"
    id="email"
    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
    placeholder="Enter your email"
  />
  <p class="mt-1 text-sm text-gray-500">
    We'll never share your email with anyone else.
  </p>
</div>
```

#### Form Group

```html
<form class="space-y-6">
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      Full Name
    </label>
    <input
      type="text"
      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
      placeholder="John Doe"
    />
  </div>

  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2"> Email </label>
    <input
      type="email"
      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
      placeholder="john@example.com"
    />
  </div>

  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      Password
    </label>
    <input
      type="password"
      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
      placeholder="••••••••"
    />
  </div>

  <button
    class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
  >
    Create Account
  </button>
</form>
```

## 🎯 Application-Specific Components

### Expense Card

```html
<div
  class="bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300"
>
  <div class="text-center">
    <div
      class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
    >
      <span class="text-2xl">💰</span>
    </div>
    <h3
      class="text-lg font-semibold text-gray-900 mb-2 font-display tracking-tight"
    >
      Group Trip to Bali
    </h3>
    <div class="space-y-2 text-sm">
      <div class="flex justify-between items-center">
        <span class="text-gray-600">Hotel</span>
        <span class="font-semibold">$240</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-600">Dinner</span>
        <span class="font-semibold">$120</span>
      </div>
      <div class="border-t pt-2 flex justify-between items-center font-bold">
        <span>You owe:</span>
        <span class="text-green-600">$146.67</span>
      </div>
    </div>
  </div>
</div>
```

### User Avatar

```html
<!-- With Image -->
<div class="w-10 h-10 rounded-full overflow-hidden">
  <img src="/avatar.jpg" alt="User Name" class="w-full h-full object-cover" />
</div>

<!-- With Initials -->
<div
  class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
>
  <span class="text-white font-semibold">JD</span>
</div>

<!-- With Status Indicator -->
<div class="relative">
  <div
    class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center"
  >
    <span class="text-white font-semibold">AS</span>
  </div>
  <div
    class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
  ></div>
</div>
```

### Loading States

#### Spinner

```html
<div class="flex items-center justify-center">
  <div
    class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
  ></div>
  <span class="ml-2 text-lg text-gray-700">Loading...</span>
</div>
```

#### Skeleton Loading

```html
<div class="animate-pulse">
  <div class="rounded-xl bg-gray-200 h-48 w-full mb-4"></div>
  <div class="space-y-3">
    <div class="h-4 bg-gray-200 rounded w-3/4"></div>
    <div class="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
</div>
```

### Status Indicators

#### Badge

```html
<!-- Success Badge -->
<span
  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
>
  Paid
</span>

<!-- Warning Badge -->
<span
  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
>
  Pending
</span>

<!-- Error Badge -->
<span
  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
>
  Overdue
</span>
```

#### Progress Bar

```html
<div class="w-full bg-gray-200 rounded-full h-2.5">
  <div
    class="bg-green-600 h-2.5 rounded-full transition-all duration-300"
    style="width: 45%"
  ></div>
</div>
```

## 📱 Responsive Components

### Mobile Menu

```html
<div class="md:hidden fixed inset-0 z-50 bg-white">
  <div class="p-4">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl font-display tracking-tight">FairShare</h1>
      <button class="text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
    <nav class="space-y-4">
      <a href="#features" class="block text-lg font-medium text-gray-900"
        >Features</a
      >
      <a href="#pricing" class="block text-lg font-medium text-gray-900"
        >Pricing</a
      >
      <button
        class="w-full bg-green-600 text-white py-3 rounded-lg font-medium"
      >
        Sign In
      </button>
    </nav>
  </div>
</div>
```

### Responsive Grid

```html
<div
  class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
>
  <!-- Grid items automatically adjust based on screen size -->
</div>
```

## ♿ Accessibility Guidelines

### Focus States

```css
/* Focus styles for interactive elements */
.focus-visible {
  outline: 2px solid #16a34a;
  outline-offset: 2px;
}

/* Custom focus for buttons */
button:focus-visible {
  outline: 2px solid #16a34a;
  outline-offset: 2px;
}
```

### ARIA Labels

```html
<!-- Button with aria-label -->
<button aria-label="Close menu" class="text-gray-600">
  <svg class="w-6 h-6">...</svg>
</button>

<!-- Form with proper labeling -->
<div>
  <label for="email" class="sr-only">Email address</label>
  <input
    id="email"
    type="email"
    aria-describedby="email-help"
    placeholder="Enter your email"
  />
  <p id="email-help" class="text-sm text-gray-500">
    We'll send you login instructions
  </p>
</div>
```

### Keyboard Navigation

```html
<!-- Skip link for keyboard users -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-green-600 text-white p-2 rounded"
>
  Skip to main content
</a>
```

## 🛠 Component States

### Interactive States

```css
/* Hover states */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

/* Active states */
.active-press:active {
  transform: scale(0.98);
}

/* Disabled states */
.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Loading States

```html
<!-- Button loading state -->
<button disabled class="bg-gray-300 text-gray-500 cursor-not-allowed">
  <svg
    class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      stroke-width="4"
      class="opacity-25"
    ></circle>
    <path
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      class="opacity-75"
    ></path>
  </svg>
  Processing...
</button>
```

## 📚 Usage Examples

### Complete Page Section

```html
<section class="py-20 bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Section Header -->
    <div class="text-center mb-16">
      <h2
        class="text-4xl lg:text-5xl font-display text-gray-900 mb-4 tracking-tight"
      >
        Everything You Need
      </h2>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto font-body">
        Powerful features designed to make expense sharing effortless
      </p>
    </div>

    <!-- Feature Grid -->
    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
      <!-- Feature cards go here -->
    </div>
  </div>
</section>
```

---

_Last updated: August 28, 2025_
