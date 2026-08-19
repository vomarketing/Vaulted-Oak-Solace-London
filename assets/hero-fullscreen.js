if (!customElements.get('hero-fullscreen')) {
  class HeroFullscreen extends HTMLElement {
    constructor() {
      super();

      this.selectors = {
        video: '.js-hero-video',
        soundBtn: '.js-sound-toggle',
        iconMuted: '.js-icon-muted',
        iconUnmuted: '.js-icon-unmuted'
      };

      this.video = null;
      this.soundBtn = null;
      this.observer = null;
      this.soundHandler = null;
    }

    connectedCallback() {
      this.video = this.querySelector(this.selectors.video);
      this.soundBtn = this.querySelector(this.selectors.soundBtn);

      this.initSoundToggle();
      this.initIntersection();
    }

    initSoundToggle() {
      if (!this.soundBtn || !this.video) return;

      this.soundHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();

        this.video.muted = !this.video.muted;

        const iconMuted = this.soundBtn.querySelector(this.selectors.iconMuted);
        const iconUnmuted = this.soundBtn.querySelector(this.selectors.iconUnmuted);

        if (this.video.muted) {
          if (iconMuted) iconMuted.style.display = 'block';
          if (iconUnmuted) iconUnmuted.style.display = 'none';
          this.soundBtn.setAttribute('aria-label', 'Unmute sound');
        } else {
          if (iconMuted) iconMuted.style.display = 'none';
          if (iconUnmuted) iconUnmuted.style.display = 'block';
          this.soundBtn.setAttribute('aria-label', 'Mute sound');
        }
      };

      this.soundBtn.addEventListener('click', this.soundHandler);
    }

    initIntersection() {
      if (!this.video) return;

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                this.video.play().catch(() => {});
              } else {
                this.video.pause();
              }
            });
          },
          {
            threshold: 0.15
          }
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

      if (this.soundHandler && this.soundBtn) {
        this.soundBtn.removeEventListener('click', this.soundHandler);
        this.soundHandler = null;
      }

      this.video = null;
      this.soundBtn = null;
    }
  }

  customElements.define('hero-fullscreen', HeroFullscreen);
}
