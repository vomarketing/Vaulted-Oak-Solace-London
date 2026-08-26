if (!customElements.get('hero-fullscreen')) {
  class HeroFullscreen extends HTMLElement {
    constructor() {
      super();

      this.selectors = {
        video: '.js-hero-video',
        soundBtn: '.js-sound-toggle'
      };

      this.classes = {
        isMuted: 'is-muted'
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

      this.setSoundState(true);

      this.soundHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();

        this.setSoundState(!this.video.muted);
      };

      this.soundBtn.addEventListener('click', this.soundHandler);
    }

    setSoundState(isMuted) {
      if (!this.video || !this.soundBtn) return;

      this.video.muted = isMuted;
      this.soundBtn.classList.toggle(this.classes.isMuted, isMuted);
      this.soundBtn.setAttribute(
        'aria-label',
        isMuted ? 'Unmute sound' : 'Mute sound'
      );
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
