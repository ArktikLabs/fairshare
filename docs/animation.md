# Animation

The FairShare animation system enhances user experience through subtle, purposeful motion that guides attention, provides feedback, and creates delightful interactions while maintaining performance and accessibility.

## 🎭 Animation Philosophy

### Design Principles

- **Purposeful** - Every animation serves a clear functional purpose
- **Subtle** - Gentle motions that enhance without distracting
- **Fast** - Quick animations that don't slow down interactions
- **Accessible** - Respectful of user preferences and accessibility needs
- **Performant** - Smooth 60fps animations using CSS transforms

### Motion Personality

FairShare animations embody:

- **Trustworthy** - Predictable, reliable motion patterns
- **Friendly** - Gentle, welcoming interactions
- **Efficient** - Quick, purposeful transitions
- **Modern** - Contemporary easing and timing

## ⏱️ Timing & Easing

### Duration Scale

```css
/* Animation durations */
--duration-fast: 150ms; /* Quick interactions */
--duration-normal: 250ms; /* Standard transitions */
--duration-slow: 350ms; /* Emphasized motions */
--duration-slower: 500ms; /* Page transitions */
```

### Easing Functions

```css
/* Easing curves */
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Tailwind Timing Classes

```html
<!-- Duration classes -->
<div class="transition-all duration-150">Fast</div>
<div class="transition-all duration-300">Normal</div>
<div class="transition-all duration-500">Slow</div>

<!-- Easing classes -->
<div class="transition-all ease-linear">Linear</div>
<div class="transition-all ease-in-out">Smooth</div>
<div class="transition-all ease-out">Natural</div>
```

## 🎯 Interactive Animations

### Hover Effects

#### Button Hover

```css
.btn-hover {
  transition: all 250ms cubic-bezier(0, 0, 0.2, 1);
  transform: translateY(0);
}

.btn-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.btn-hover:active {
  transform: translateY(0);
  transition-duration: 150ms;
}
```

```html
<button
  class="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
>
  Get Started Free
</button>
```

#### Card Hover

```css
.card-hover {
  transition: all 300ms ease;
  transform: translateY(0) rotate(0deg);
}

.card-hover:hover {
  transform: translateY(-4px) rotate(0deg);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}
```

```html
<div
  class="bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300"
>
  <!-- Card content -->
</div>
```

### Focus States

```css
.focus-ring {
  transition: all 200ms ease;
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.focus-ring:focus-visible {
  outline-color: #16a34a;
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.1);
}
```

### Click Feedback

```css
.click-feedback {
  transition: transform 150ms ease;
}

.click-feedback:active {
  transform: scale(0.98);
}
```

## 🌊 Loading Animations

### Spinner

```css
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

```html
<div
  class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
></div>
```

### Pulse Loading

```css
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

```html
<div class="animate-pulse">
  <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

### Skeleton Loading

```html
<div class="animate-pulse">
  <div class="rounded-xl bg-gray-200 h-48 w-full mb-4"></div>
  <div class="space-y-3">
    <div class="h-4 bg-gray-200 rounded w-3/4"></div>
    <div class="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
</div>
```

## 📱 Page Transitions

### Fade In

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn 500ms ease-out;
}
```

### Slide In

```css
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-in-up {
  animation: slideInUp 400ms ease-out;
}
```

### Scale In

```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.scale-in {
  animation: scaleIn 300ms ease-out;
}
```

## 🎨 Scroll Animations

### Scroll-Triggered Animations

```css
/* Elements that animate on scroll */
.scroll-animate {
  opacity: 0;
  transform: translateY(30px);
  transition: all 600ms ease;
}

.scroll-animate.in-view {
  opacity: 1;
  transform: translateY(0);
}
```

### Parallax Effects

```css
.parallax {
  transform: translateY(var(--scroll-offset, 0));
  transition: transform 100ms linear;
}
```

### Navigation Scroll

```css
.nav-scroll {
  transition: all 300ms ease;
  background-color: transparent;
  backdrop-filter: blur(0px);
}

.nav-scroll.scrolled {
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
```

## 💫 Micro-Interactions

### Icon Animations

```css
.icon-bounce:hover {
  animation: bounce 0.6s ease;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
```

### Form Feedback

```css
.form-success {
  animation: successPulse 0.6s ease;
}

@keyframes successPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
```

### Count-Up Animation

```css
.count-up {
  animation: countUp 1s ease-out;
}

@keyframes countUp {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

## 🔄 State Transitions

### Modal Animations

```css
/* Modal backdrop */
.modal-backdrop {
  opacity: 0;
  transition: opacity 300ms ease;
}

.modal-backdrop.open {
  opacity: 1;
}

/* Modal content */
.modal-content {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
  transition: all 300ms ease;
}

.modal-content.open {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

### Tab Transitions

```css
.tab-content {
  opacity: 0;
  transform: translateX(20px);
  transition: all 250ms ease;
}

.tab-content.active {
  opacity: 1;
  transform: translateX(0);
}
```

### Toggle Animations

```css
.toggle-switch {
  transition: all 200ms ease;
}

.toggle-switch input:checked + .toggle-slider {
  transform: translateX(100%);
  background-color: #16a34a;
}
```

## 📊 Progress Animations

### Progress Bar

```css
.progress-bar {
  width: 0%;
  transition: width 500ms ease-out;
  background: linear-gradient(90deg, #16a34a, #22c55e);
}

.progress-bar.animated {
  width: var(--progress-width);
}
```

### Circular Progress

```css
@keyframes circularProgress {
  from {
    stroke-dashoffset: 314;
  }
  to {
    stroke-dashoffset: var(--progress-offset);
  }
}

.circular-progress {
  animation: circularProgress 1s ease-out;
}
```

## 🎪 Complex Animations

### Card Flip

```css
.card-flip {
  perspective: 1000px;
}

.card-flip-inner {
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.card-flip:hover .card-flip-inner {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  backface-visibility: hidden;
}

.card-back {
  transform: rotateY(180deg);
}
```

### Staggered Animations

```css
.stagger-item {
  opacity: 0;
  transform: translateY(20px);
  animation: staggerIn 400ms ease forwards;
}

.stagger-item:nth-child(1) {
  animation-delay: 0ms;
}
.stagger-item:nth-child(2) {
  animation-delay: 100ms;
}
.stagger-item:nth-child(3) {
  animation-delay: 200ms;
}

@keyframes staggerIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## ♿ Accessibility Considerations

### Respecting User Preferences

```css
/* Reduce motion for users who prefer it */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Focus Visibility

```css
/* Enhanced focus for keyboard users */
@media (prefers-reduced-motion: no-preference) {
  .focus-enhanced:focus-visible {
    animation: focusPulse 1s ease-in-out;
  }
}

@keyframes focusPulse {
  0%,
  100% {
    box-shadow: 0 0 0 2px #16a34a;
  }
  50% {
    box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.4);
  }
}
```

### Screen Reader Friendly

```html
<!-- Announce loading states -->
<div aria-live="polite" aria-busy="true">
  <div class="spinner"></div>
  <span class="sr-only">Loading content...</span>
</div>
```

## 🛠 Implementation Examples

### Complete Button Component

```html
<button
  class="group relative overflow-hidden bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-98 shadow-lg hover:shadow-xl"
>
  <!-- Button text -->
  <span class="relative z-10">Get Started Free</span>

  <!-- Hover effect overlay -->
  <div
    class="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
  ></div>
</button>
```

### Animated Card Grid

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  <div
    class="stagger-item bg-white rounded-xl shadow-lg p-6 hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
  >
    <!-- Card content -->
  </div>
</div>
```

### Loading States

```html
<!-- Skeleton loader -->
<div class="animate-pulse space-y-4">
  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
  <div class="h-32 bg-gray-200 rounded"></div>
</div>

<!-- Spinner loader -->
<div class="flex items-center justify-center p-8">
  <div
    class="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"
  ></div>
  <span class="ml-2 text-gray-600">Loading...</span>
</div>
```

## 🔧 Animation Utilities

### Custom CSS Classes

```css
/* Utility animations */
.fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

.fade-in-down {
  animation: fadeInDown 0.6s ease-out;
}

.zoom-in {
  animation: zoomIn 0.4s ease-out;
}

.slide-in-left {
  animation: slideInLeft 0.5s ease-out;
}

/* Hover utilities */
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.hover-grow:hover {
  transform: scale(1.05);
}

.hover-rotate:hover {
  transform: rotate(5deg);
}
```

### JavaScript Integration

```javascript
// Intersection Observer for scroll animations
const observeElements = () => {
  const elements = document.querySelectorAll(".scroll-animate");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
      }
    });
  });

  elements.forEach((el) => observer.observe(el));
};
```

---

_Last updated: August 28, 2025_
