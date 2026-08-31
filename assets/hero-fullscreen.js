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

      this.setPlaybackState(this.video.paused);

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
