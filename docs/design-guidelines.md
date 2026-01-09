# LazyShorts Design Guidelines

## Overview

This document provides guidelines for maintaining consistency across the LazyShorts extension UI. All components should follow these patterns to ensure a cohesive, accessible, and maintainable codebase.

---

## Design Principles

1. **Minimalism**: YouTube-inspired clean interface with no unnecessary elements
2. **Consistency**: Reuse design tokens from `design-system.css`
3. **Accessibility**: WCAG 2.1 AA compliance for all interactive elements
4. **Performance**: Lightweight CSS with minimal DOM manipulation
5. **Responsiveness**: Adapt to different viewport sizes gracefully

---

## BEM Naming Convention

LazyShorts uses the **Block Element Modifier (BEM)** methodology for CSS class naming.

### Structure

```
.block__element--modifier
```

- **Block**: Standalone component (e.g., `.popup`, `.toggle`, `.settings`)
- **Element**: Part of a block (e.g., `.popup__header`, `.toggle__slider`)
- **Modifier**: Variation of a block/element (e.g., `.popup__button--primary`, `.toggle--disabled`)

### Examples

#### Good ✅

```html
<div class="popup">
  <div class="popup__header">
    <h1 class="popup__title">LazyShorts</h1>
  </div>
  <button class="popup__button popup__button--primary">Enable</button>
  <button class="popup__button popup__button--icon" aria-label="Settings">
    <svg>...</svg>
  </button>
</div>
```

```css
.popup { }
.popup__header { }
.popup__title { }
.popup__button { }
.popup__button--primary { }
.popup__button--icon { }
```

#### Bad ❌

```html
<!-- Avoid generic class names -->
<div class="container">
  <div class="header">
    <h1 class="title">LazyShorts</h1>
  </div>
  <button class="btn btn-primary">Enable</button>
</div>
```

```css
/* Avoid deep nesting */
.popup .header .title { }

/* Avoid non-BEM naming */
.primaryButton { }
.icon-button { }
```

---

## Color System

### Using CSS Custom Properties

Always reference design system variables instead of hardcoding colors:

```css
/* Good ✅ */
.popup {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
}

/* Bad ❌ */
.popup {
  background-color: #ffffff;
  color: #0f0f0f;
  border: 1px solid #e0e0e0;
}
```

### Theme Modes

The extension supports three theme modes:
- **Auto**: Respects system preference (`prefers-color-scheme`)
- **Light**: Force light mode via `[data-theme="light"]`
- **Dark**: Force dark mode via `[data-theme="dark"]`

Apply theme to the `<html>` or `<body>` element:

```javascript
// Set theme
document.documentElement.dataset.theme = 'dark'; // or 'light' or remove for auto
```

### Color Contrast

Ensure all text meets **WCAG 2.1 AA** standards:
- **Body text (14px+)**: Minimum 4.5:1 contrast ratio
- **Large text (18px+)**: Minimum 3:1 contrast ratio

Use browser DevTools or online tools to verify contrast.

---

## Typography

### Font Sizes

Use predefined font size variables:

```css
.popup__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.popup__description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
```

### Text Hierarchy

| Element | Size Variable | Weight | Usage |
|---------|---------------|--------|-------|
| Main heading | `--font-size-xl` | `--font-weight-bold` | Page titles |
| Section heading | `--font-size-lg` | `--font-weight-bold` | Section titles |
| Body text | `--font-size-base` | `--font-weight-normal` | Default text |
| Small text | `--font-size-sm` | `--font-weight-normal` | Labels, captions |
| Micro text | `--font-size-xs` | `--font-weight-normal` | Footer, credits |

---

## Spacing

Use the 8px grid system for consistent spacing:

```css
.popup {
  padding: var(--space-base); /* 16px */
  gap: var(--space-md);        /* 24px */
}

.popup__button {
  margin-top: var(--space-sm); /* 8px */
}
```

### Spacing Scale

| Variable | Value | Common Usage |
|----------|-------|--------------|
| `--space-xs` | 4px | Icon padding, fine adjustments |
| `--space-sm` | 8px | Button padding, tight spacing |
| `--space-base` | 16px | Default padding, margins |
| `--space-md` | 24px | Section spacing |
| `--space-lg` | 32px | Page padding |
| `--space-xl` | 48px | Large separators |

---

## Component Patterns

### Buttons

```html
<button class="button button--primary" aria-label="Enable auto-skip">
  Enable
</button>

<button class="button button--secondary" aria-label="Cancel">
  Cancel
</button>

<button class="button button--icon" aria-label="Settings">
  <svg width="20" height="20">...</svg>
</button>
```

```css
.button {
  padding: var(--button-padding-y) var(--button-padding-x);
  border-radius: var(--button-border-radius);
  font-size: var(--button-font-size);
  font-weight: var(--button-font-weight);
  border: none;
  cursor: pointer;
  transition: var(--button-transition);
}

.button--primary {
  background-color: var(--color-button-primary-bg);
  color: var(--color-button-primary-text);
}

.button--primary:hover {
  background-color: var(--color-primary-hover);
}

.button--secondary {
  background-color: var(--color-button-secondary-bg);
  color: var(--color-button-secondary-text);
}

.button--icon {
  padding: var(--space-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### Toggle Switch

```html
<label class="toggle">
  <input type="checkbox" class="toggle__input" id="enableToggle">
  <span class="toggle__slider"></span>
  <span class="toggle__label">Auto-skip enabled</span>
</label>
```

```css
.toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.toggle__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle__slider {
  position: relative;
  width: var(--toggle-width);
  height: var(--toggle-height);
  background-color: var(--color-toggle-bg);
  border-radius: var(--border-radius-full);
  transition: background-color var(--transition-base);
}

.toggle__slider::before {
  content: "";
  position: absolute;
  width: var(--toggle-slider-size);
  height: var(--toggle-slider-size);
  left: var(--toggle-slider-offset);
  top: var(--toggle-slider-offset);
  background-color: white;
  border-radius: 50%;
  transition: transform var(--transition-base);
}

.toggle__input:checked + .toggle__slider {
  background-color: var(--color-toggle-enabled);
}

.toggle__input:checked + .toggle__slider::before {
  transform: translateX(20px);
}

.toggle__input:focus-visible + .toggle__slider {
  outline: var(--border-width-medium) solid var(--color-border-focus);
  outline-offset: 2px;
}
```

### Cards

```html
<div class="card">
  <div class="card__header">
    <h2 class="card__title">Settings</h2>
  </div>
  <div class="card__body">
    <!-- Content -->
  </div>
</div>
```

```css
.card {
  background-color: var(--color-bg-secondary);
  border-radius: var(--card-border-radius);
  padding: var(--card-padding);
  box-shadow: var(--card-shadow);
}
```

---

## Accessibility Guidelines

### ARIA Labels

All interactive elements must have accessible names:

```html
<!-- Good ✅ -->
<button class="button button--icon" aria-label="Open settings">
  <svg>...</svg>
</button>

<!-- Bad ❌ -->
<button class="button button--icon">
  <svg>...</svg>
</button>
```

### Keyboard Navigation

- **Tab**: Focus next element
- **Shift + Tab**: Focus previous element
- **Enter**: Activate button/link
- **Space**: Toggle checkbox/toggle

Ensure all interactive elements are keyboard accessible:

```css
/* Visible focus indicators */
.button:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

/* Don't remove outlines globally */
/* Bad ❌ */
* {
  outline: none;
}
```

### Semantic HTML

Use appropriate HTML elements:

```html
<!-- Good ✅ -->
<button type="button">Click me</button>
<a href="https://example.com">Visit</a>

<!-- Bad ❌ -->
<div onclick="handleClick()">Click me</div>
<span class="link">Visit</span>
```

### Screen Reader Support

- Use `aria-live` for dynamic content updates
- Provide `alt` text for images
- Use `<label>` elements for form inputs

```html
<label for="delayInput">Delay (seconds):</label>
<input type="number" id="delayInput" min="0" max="5" aria-describedby="delayHelp">
<span id="delayHelp" class="help-text">Choose a delay between 0-5 seconds</span>
```

---

## Dark Mode Implementation

### Automatic Dark Mode

Dark mode is automatically applied when the user's system preference is set to dark:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #0f0f0f;
    --color-text-primary: #f1f1f1;
    /* Other dark mode values */
  }
}
```

### Manual Theme Switching

Allow users to override auto mode:

```javascript
// settings.js
async function setTheme(theme) {
  // Save to storage
  await chrome.storage.sync.set({ darkMode: theme });
  
  // Apply to current page
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.dataset.theme = theme;
  }
}
```

---

## Performance Best Practices

### CSS Optimization

1. **Avoid deep selectors**: Max 3 levels deep
   ```css
   /* Good ✅ */
   .popup__button { }
   
   /* Bad ❌ */
   .popup .header .nav .button { }
   ```

2. **Use CSS variables**: Faster than repeated values
3. **Minimize reflows**: Avoid layout-triggering properties in animations
4. **Use `will-change` sparingly**: Only for actively animating elements

### JavaScript Performance

1. **Debounce expensive operations**: Settings updates, DOM queries
2. **Remove event listeners**: Clean up when disabled
3. **Use event delegation**: Single listener for multiple elements
4. **Batch DOM updates**: Minimize reflows/repaints

---

## Testing Checklist

Before considering a component complete, verify:

- [ ] **Visual**: Matches design, looks good in light/dark mode
- [ ] **Accessibility**: Keyboard navigable, screen reader friendly
- [ ] **Responsive**: Works at different sizes (320px - 1920px)
- [ ] **BEM compliance**: Class names follow conventions
- [ ] **CSS validation**: Passes W3C CSS validator
- [ ] **Color contrast**: Meets WCAG 2.1 AA standards (4.5:1 minimum)
- [ ] **Browser testing**: Works in Chrome and Opera (latest versions)

---

## Resources

- **BEM Methodology**: [getbem.com](https://getbem.com/)
- **WCAG 2.1 Guidelines**: [w3.org/WAI/WCAG21/quickref](https://www.w3.org/WAI/WCAG21/quickref/)
- **CSS Validator**: [jigsaw.w3.org/css-validator](https://jigsaw.w3.org/css-validator/)
- **Contrast Checker**: Chrome DevTools → Elements → Styles → Color picker
- **YouTube Design**: Inspect [youtube.com](https://www.youtube.com) for inspiration

---

**Last Updated**: January 2026  
**Maintained by**: Mellow Solutions
