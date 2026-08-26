# Store

* Dev: <https://solace-london-development-store.myshopify.com/>
* Live: <https://solacelondon.com/>

---

## 1. Technical Standards

* **Platform:** Shopify Online Store 2.0.
* **International Standard BEM:**
  * All new sections and components must follow **Standard BEM**: `block__element--modifier`.
  * Example: `.hero-fullscreen`, `.hero-fullscreen__media`, `.hero-fullscreen__content`, `.hero-fullscreen__heading`, `.hero-fullscreen__cta`.
* **JS DOM Hook Convention:**
  * Always use the `js-` prefix for DOM query selectors to fully separate JS logic from CSS styling: `.js-hero-video`, `.js-sound-toggle`, `.js-section-header-contrast`.
  * Initialize `this.selectors = { ... }` and `this.classes = { ... }` at the top of the component `constructor()`.

---

## 2. Theme Breakpoint System

Breakpoints are declared centrally in **snippets/variables.liquid**

| Screen | Media Query |
| --- | --- |
| **Mobile & Tablet** | `@media (max-width: 900px)` |
| **Desktop** | `@media (min-width: 901px)` |
| **Large Desktop** | `@media (min-width: 1201px)` |
| **Extra Large** | `@media (min-width: 1440px)` |

> **IMPORTANT**
> The breakpoint between Mobile/Tablet and Desktop is **`901px`** (do not use `768px`).

---

## 3. Homepage Section Height Convention (Fullscreen Height)

* **Required rule when creating new Homepage sections:**
  * Every section on the Homepage must be designed to display at **Full Screen Height (100dvh)**:

    ```css
    .section-block-name {
      position: relative;
      width: 100vw;
      height: 100dvh;
      overflow: hidden;
    }
    ```
  * The fullpage scroll mechanism **assets/custom-fullpage-scroll.js** applies automatically to all Homepage sections (`#MainContent > .shopify-section`).

---

## 4. Header Contrast Auto-Switch Mechanism

The header automatically inverts text, logo and cart icon colors based on the brightness of the current section background on scroll.

### 4.1 Class & Data Attribute Rules for Sections

Each new Homepage section must declare the contrast class in its schema:

```liquid
{%- schema -%}
{
  "name": "Hero Fullscreen",
  "tag": "section",
  "class": "shopify-section-hero-fullscreen js-section-header-contrast",
  "settings": [
    {
      "type": "select",
      "id": "header_contrast_mode",
      "label": "Header contrast mode",
      "options": [
        { "value": "light", "label": "Light Header (White text for dark background)" },
        { "value": "dark", "label": "Dark Header (Black text for light background)" }
      ],
      "default": "light"
    }
  ]
}
{%- endschema -%}
```

And set the `data-header-mode` attribute on the root element:

```liquid
<hero-fullscreen
  class="hero-fullscreen js-hero-fullscreen"
  data-header-mode="{{ section.settings.header_contrast_mode | default: 'light' }}"
>
  ...
</hero-fullscreen>
```

### 4.2 Header Mode Reference

| data-header-mode | Section Background |
| --- | --- |
| **light** | Dark media |
| **dark** (default) | Light media |

---

## 5. Web Component Structure Template (Custom Elements)

All new interactive JS features must be encapsulated as Native Web Components:

```javascript
if (!customElements.get('hero-fullscreen')) {
  class HeroFullscreen extends HTMLElement {
    constructor() {
      super();

      this.selectors = {
        video: '.js-hero-video',
        soundBtn: '.js-sound-toggle'
      };

      this.video = null;
      this.soundBtn = null;
    }

    connectedCallback() {
      this.video = this.querySelector(this.selectors.video);
      this.soundBtn = this.querySelector(this.selectors.soundBtn);
      this.initEvents();
    }

    initEvents() {
      // Event listeners setup
    }

    disconnectedCallback() {
      // Cleanup listeners and observers
    }
  }

  customElements.define('hero-fullscreen', HeroFullscreen);
}
```
