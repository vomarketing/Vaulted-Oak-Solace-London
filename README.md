# Store

* **Dev:** <https://solace-london-development-store.myshopify.com/>
* **Live:** <https://solacelondon.com/>

---

## 1. Technical Standards & Code Conventions

* **Platform:** Shopify Online Store 2.0.
* **International Standard BEM:**
  * All sections, snippets, and components must strictly follow **Standard BEM**: `block__element--modifier`.
  * *Example:* `.hero-fullscreen`, `.hero-fullscreen__media`, `.hero-fullscreen__content`, `.hero-fullscreen__heading`, `.hero-fullscreen__playback-toggle`.
* **JS DOM Hook Convention:**
  * Always use the `js-` prefix for DOM query selectors to completely decouple JavaScript logic from CSS presentation: `.js-hero-video`, `.js-playback-toggle`, `.js-section-header-contrast`.
  * Declare and initialize `this.selectors = { ... }` and `this.classes = { ... }` at the top of the component `constructor()`.
* **Language Standards:**
  * All Liquid schema `label`, `info`, and `paragraph` descriptions must be written in **English**.
  * Code symbols, CSS classes, filenames, and commit messages must strictly be in **English** following Conventional Commits.

---

## 2. Theme Breakpoint System

Breakpoints and global design tokens are declared centrally in **`snippets/variables.liquid`**:

| Breakpoint Variable | Value | Media Query Target |
|---|---|---|
| `--breakpoint-sm` | `640px` | Small Mobile (`@media (min-width: 640px)`) |
| `--breakpoint-md` | `768px` | Tablet (`@media (min-width: 768px)`) |
| `--breakpoint-lg` | `901px` | **Primary Desktop Boundary** (`@media (min-width: 901px)`) |
| `--breakpoint-xl` | `1201px` | Large Desktop (`@media (min-width: 1201px)`) |
| `--breakpoint-2xl` | `1440px` | Extra Large Desktop (`@media (min-width: 1440px)`) |
| `--breakpoint-3xl` | `1600px` | Ultra-Wide Desktop (`@media (min-width: 1600px)`) |

> [!IMPORTANT]
> The primary boundary between Mobile/Tablet and Desktop across the theme is **`901px`** (`max-width: 900px` for mobile/tablet, `min-width: 901px` for desktop).

---

## 3. Section Height & Mobile Header Clearance Conventions

### 3.1 Fullscreen Height (`100dvh`)
* Homepage fullpage sections must utilize `100dvh` (or `min-height: 100dvh`) to ensure proper viewport filling across modern mobile browsers (Safari / Chrome dynamic toolbars):
  ```css
  .section-name {
    position: relative;
    width: 100vw;
    min-height: 100dvh;
    overflow: hidden;
  }
  ```
* The fullpage scroll engine in **`assets/custom-fullpage-scroll.js`** handles snapping for `#MainContent > .shopify-section`.

### 3.2 Mobile Header Clearance (Sticky Header Support)
* On mobile screens (`< 901px`), a sticky header of height `~52px–60px` is active.
* Fullscreen and editorial sections must define `--header-offset-mobile` (default `52px`) and include safe-area clearance in `padding-top` to prevent content or typography from colliding with the logo:
  ```css
  .section-name__inner {
    --header-offset-mobile: 52px;
    padding-top: calc(var(--header-offset-mobile) + 24px);
  }
  ```
* Any dynamic `max-height` constraints on mobile media should subtract the header offset:
  ```css
  max-height: calc(100dvh - var(--header-offset-mobile, 52px) - ...);
  ```

---

## 4. Header Contrast Auto-Switch Mechanism

The header dynamically switches between light (white text/logo) and dark (black text/logo) color schemes based on the section currently in view.

### 4.1 Section Schema Declaration
Declare the contrast class `js-section-header-contrast` in the section schema:

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

### 4.2 Root Element Binding
Bind the `data-header-mode` attribute to the root section element:

```liquid
<hero-fullscreen
  class="hero-fullscreen js-hero-fullscreen"
  data-header-mode="{{ section.settings.header_contrast_mode | default: 'light' }}"
>
  ...
</hero-fullscreen>
```

| `data-header-mode` | Section Background | Header Visual Output |
|---|---|---|
| **`light`** | Dark media / Dark background | White logo, navigation, and cart icons |
| **`dark`** (default) | Light media / White background | Black logo, navigation, and cart icons |

---

## 5. Media & Image Upload Standards

### 5.1 Responsive Image Rendering (`picture.liquid`)
* Always render responsive imagery using `snippets/picture.liquid` to generate proper `<picture>` elements with mobile `<source>` tags and high-DPI `srcset`:
  ```liquid
  {%- render 'picture',
    image_desktop: section.settings.image_desktop,
    image_mobile: section.settings.image_mobile,
    class: 'section-name__image',
    breakpoint: '900px',
    sizes: '(min-width: 901px) 50vw, 100vw'
  -%}
  ```

### 5.2 Recommended Image Sizes (2x Retina Standard)
* All `image_picker` settings in schemas must include an `info` field specifying recommended **2x Retina** dimensions and aspect ratios:
  * **Fullscreen Hero / Full-Width Banner:** Desktop `3840 x 2160 px` (16:9), Mobile `1500 x 2000 px` (3:4 / 9:16).
  * **Featured Image (Editorial):** Desktop `2360 x 1506 px` (1180:753 Landscape), Mobile `1192 x 1686 px` (596:843 Portrait).
  * **2-Up Media (50% Split):** Desktop `1062 x 1506 px` (531:753 Portrait), Mobile `670 x 948 px` (335:474 Portrait).
  * **3-Up Media / Slider:** Desktop `2356 x 1504 px` / `1072 x 1520 px`, Mobile `630 x 986 px` / `536 x 760 px`.
  * **Media Grids / Lookbooks:** Full-width `3840 x 2160 px`, Half `1600 x 2133 px`, Third `1200 x 1600 px`, Mobile `1200 x 1600 px`.

---

## 6. Video & Ambient Playback Standards

* **Hero & Ambient Background Videos:**
  * Must always autoplay, loop, and be **permanently muted**:
    ```liquid
    <video
      class="section-name__video js-hero-video"
      autoplay
      loop
      muted
      playsinline
      preload="metadata"
    >
      <source src="{{ mobile_video_url }}" media="(max-width: 900px)" type="video/mp4">
      <source src="{{ desktop_video_url }}" type="video/mp4">
    </video>
    ```
* **Playback Controls (Play / Pause):**
  * Use a toggle button with `.js-playback-toggle` rendering `icons` (`pause` when playing, `play` when paused).
  * The button must update its `aria-label` dynamically between `"Pause video"` and `"Play video"`.

---

## 7. Web Component Architecture Template (Custom Elements)

All interactive features must be encapsulated as native Web Components with full lifecycle management and event listener cleanup:

```javascript
if (!customElements.get('hero-fullscreen')) {
  class HeroFullscreen extends HTMLElement {
    constructor() {
      super();

      this.selectors = {
        video: '.js-hero-video',
        playbackBtn: '.js-playback-toggle'
      };

      this.classes = {
        isPaused: 'is-paused'
      };

      this.video = null;
      this.playbackBtn = null;
      this.observer = null;
      this.playbackHandler = null;
      this.onPlay = null;
      this.onPause = null;
      this.userPaused = false;
    }

    connectedCallback() {
      this.video = this.querySelector(this.selectors.video);
      this.playbackBtn = this.querySelector(this.selectors.playbackBtn);

      if (this.video) {
        this.video.muted = true;
      }

      this.initPlaybackToggle();
      this.initIntersection();
    }

    initPlaybackToggle() {
      if (!this.playbackBtn || !this.video) return;

      this.playbackHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (this.video.paused) {
          this.userPaused = false;
          this.video.play().catch(() => {});
        } else {
          this.userPaused = true;
          this.video.pause();
        }
      };

      this.onPlay = () => this.setPlaybackState(false);
      this.onPause = () => this.setPlaybackState(true);

      this.playbackBtn.addEventListener('click', this.playbackHandler);
      this.video.addEventListener('play', this.onPlay);
      this.video.addEventListener('pause', this.onPause);
    }

    setPlaybackState(isPaused) {
      if (!this.playbackBtn) return;

      this.playbackBtn.classList.toggle(this.classes.isPaused, isPaused);
      this.playbackBtn.setAttribute(
        'aria-label',
        isPaused ? 'Play video' : 'Pause video'
      );
    }

    initIntersection() {
      if (!this.video) return;

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                if (!this.userPaused) {
                  this.video.play().catch(() => {});
                }
              } else {
                this.video.pause();
              }
            });
          },
          { threshold: 0.15 }
        );

        this.observer.observe(this);
      } else {
        this.video.play().catch(() => {});
      }
    }

    disconnectedCallback() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      if (this.playbackHandler && this.playbackBtn) {
        this.playbackBtn.removeEventListener('click', this.playbackHandler);
        this.playbackHandler = null;
      }

      if (this.video) {
        if (this.onPlay) {
          this.video.removeEventListener('play', this.onPlay);
          this.onPlay = null;
        }
        if (this.onPause) {
          this.video.removeEventListener('pause', this.onPause);
          this.onPause = null;
        }
      }

      this.video = null;
      this.playbackBtn = null;
    }
  }

  customElements.define('hero-fullscreen', HeroFullscreen);
}
```

---

## 8. Development & Build Scripts

```bash
# Start development server with live reload & assets bundling
npm run dev

# Start development server with production build preview
npm run dev-prod

# Build production assets
npm run build
```
