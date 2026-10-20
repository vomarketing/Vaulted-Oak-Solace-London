if (!customElements.get('hero-fullscreen')) {
  class HeroFullscreen extends HTMLElement {
    constructor() {
      super();

      this.selectors = {
        video: '.js-hero-video',
        playbackBtn: '.js-playback-toggle',
        muteBtn: '.js-mute-toggle',
        progress: '.js-timeline-range',
        played: '.js-timeline-played',
        buffered: '.js-timeline-buffered',
        currentTime: '.js-current-time',
        duration: '.js-duration',
        timelineWrap: '.js-timeline-wrap'
      };

      this.classes = {
        isPaused: 'is-paused'
      };

      this.video = null;
      this.playbackBtn = null;
      this.muteBtn = null;
      this.progress = null;
      this.played = null;
      this.buffered = null;
      this.currentTime = null;
      this.duration = null;
      this.timelineWrap = null;
      this.observer = null;
      this.listeners = [];
      this.seeking = false;
      this.autoplay = false;
      this.showControls = false;
      this.userPaused = true;

      this.icons = {
        play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg>',
        pause: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7.80005" y="6" width="1.2" height="12" fill="white"/><rect x="15" y="6" width="1.2" height="12" fill="white"/></svg>',
        volume: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"> <path fill-rule="evenodd" clip-rule="evenodd" d="M8.98678 1.98438V14.0164L5.35345 11.2137H1.65479V4.78704H5.35478L8.98678 1.98438ZM7.98678 4.01904L5.69478 5.78638H2.65478V10.2137H5.69478L7.98678 11.9817V4.01904Z" fill="white"/> <path d="M12.3308 7.99847C12.3308 9.02514 11.9734 9.96847 11.3774 10.7105L12.0874 11.4211C12.8921 10.4623 13.3324 9.2502 13.3308 7.99847C13.3324 6.81503 12.939 5.6649 12.2128 4.73047L11.4988 5.44447C12.0407 6.18536 12.3322 7.08051 12.3308 7.99847Z" fill="white"/> </svg>',
        muted: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.98678 1.98438V14.0164L5.35345 11.2137H1.65479V4.78704H5.35478L8.98678 1.98438ZM7.98678 4.01904L5.69478 5.78638H2.65478V10.2137H5.69478L7.98678 11.9817V4.01904Z" fill="white"/><path d="M11 6L14 10M14 6L11 10" stroke="white" stroke-width="1"/></svg>'
      };
    }

    connectedCallback() {
      this.video = this.querySelector(this.selectors.video);
      if (!this.video) return;

      this.playbackBtn = this.querySelector(this.selectors.playbackBtn);
      this.muteBtn = this.querySelector(this.selectors.muteBtn);
      this.progress = this.querySelector(this.selectors.progress);
      this.played = this.querySelector(this.selectors.played);
      this.buffered = this.querySelector(this.selectors.buffered);
      this.currentTime = this.querySelector(this.selectors.currentTime);
      this.duration = this.querySelector(this.selectors.duration);
      this.timelineWrap = this.querySelector(this.selectors.timelineWrap);

      this.autoplay = this.dataset.autoplay === 'true';
      this.showControls = this.dataset.showControls === 'true';
      this.userPaused = !this.autoplay;

      this.video.muted = true;
      this.video.defaultMuted = true;

      this.initPlaybackToggle();
      this.initCustomControls();
      this.initIntersection();
      this.updatePlayUI();
      this.updateMuteUI();

      if (this.video.readyState >= 1) {
        this.updateDuration();
        this.updateTimeline();
      }
    }

    initPlaybackToggle() {
      if (!this.playbackBtn || !this.video) return;

      this.listen(this.playbackBtn, 'click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.togglePlayback();
      });

      this.listen(this.video, 'play', () => this.updatePlayUI());
      this.listen(this.video, 'pause', () => this.updatePlayUI());
      this.listen(this.video, 'ended', () => this.updatePlayUI());
    }

    initCustomControls() {
      if (!this.showControls) return;

      if (this.muteBtn) {
        this.listen(this.muteBtn, 'click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.video.muted = !this.video.muted;
        });
      }

      this.listen(this.video, 'volumechange', () => this.updateMuteUI());
      this.listen(this.video, 'loadedmetadata', () => {
        this.updateDuration();
        this.updateTimeline();
      });
      this.listen(this.video, 'durationchange', () => this.updateDuration());
      this.listen(this.video, 'timeupdate', () => this.updateTimeline());
      this.listen(this.video, 'progress', () => this.updateBuffered());

      if (this.progress) {
        this.listen(this.progress, 'pointerdown', () => {
          this.seeking = true;
        });

        this.listen(this.progress, 'input', () => this.previewSeek());
        this.listen(this.progress, 'change', () => this.commitSeek());
        this.listen(this.progress, 'pointerup', () => this.commitSeek());
        this.listen(this.progress, 'pointercancel', () => this.commitSeek());
      }

      this.setAttribute('tabindex', '0');
      this.listen(this, 'keydown', (event) => this.handleKeyboard(event));
    }

    listen(element, eventName, handler) {
      if (!element) return;

      element.addEventListener(eventName, handler);
      this.listeners.push({ element, eventName, handler });
    }

    togglePlayback() {
      if (this.video.paused || this.video.ended) {
        this.userPaused = false;
        this.video.play().catch(() => {});
      } else {
        this.userPaused = true;
        this.video.pause();
      }
    }

    updatePlayUI() {
      if (!this.video) return;

      const isPlaying = !this.video.paused && !this.video.ended;

      if (this.playbackBtn) {
        this.playbackBtn.classList.toggle(this.classes.isPaused, !isPlaying);
        this.playbackBtn.setAttribute('aria-label', isPlaying ? 'Pause video' : 'Play video');

        if (this.showControls) {
          this.playbackBtn.innerHTML = isPlaying ? this.icons.pause : this.icons.play;
        }
      }
    }

    updateMuteUI() {
      if (!this.video || !this.muteBtn) return;

      const isMuted = this.video.muted || this.video.volume === 0;
      this.muteBtn.innerHTML = isMuted ? this.icons.muted : this.icons.volume;
      this.muteBtn.setAttribute('aria-label', isMuted ? 'Unmute video' : 'Mute video');
    }

    formatTime(seconds) {
      if (!Number.isFinite(seconds)) return '00:00';

      const totalSeconds = Math.max(0, Math.floor(seconds));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const remainingSeconds = totalSeconds % 60;

      if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
      }

      return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    updateDuration() {
      if (this.duration) {
        this.duration.textContent = this.formatTime(this.video.duration);
      }
    }

    updateTimeline() {
      if (!this.video.duration || this.seeking) return;

      const percentage = (this.video.currentTime / this.video.duration) * 100;

      if (this.progress) {
        this.progress.value = Math.round((this.video.currentTime / this.video.duration) * 1000);
      }
      if (this.played) this.played.style.width = `${percentage}%`;
      if (this.timelineWrap) this.timelineWrap.style.setProperty('--thumb-position', `${percentage}%`);
      if (this.currentTime) this.currentTime.textContent = this.formatTime(this.video.currentTime);
    }

    updateBuffered() {
      if (!this.buffered || !this.video.duration || this.video.buffered.length === 0) return;

      const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
      this.buffered.style.width = `${Math.min(100, (bufferedEnd / this.video.duration) * 100)}%`;
    }

    previewSeek() {
      if (!this.progress || !this.video.duration) return;

      const percentage = Number(this.progress.value) / 1000;
      if (this.played) this.played.style.width = `${percentage * 100}%`;
      if (this.timelineWrap) this.timelineWrap.style.setProperty('--thumb-position', `${percentage * 100}%`);
      if (this.currentTime) this.currentTime.textContent = this.formatTime(percentage * this.video.duration);
    }

    commitSeek() {
      if (!this.progress || !this.video.duration) return;

      this.video.currentTime = (Number(this.progress.value) / 1000) * this.video.duration;
      this.seeking = false;
    }

    handleKeyboard(event) {
      if (event.target !== this) return;

      const key = event.key.toLowerCase();

      if (key === ' ' || key === 'k') {
        event.preventDefault();
        this.togglePlayback();
      } else if (key === 'arrowleft') {
        event.preventDefault();
        this.video.currentTime = Math.max(0, this.video.currentTime - 5);
      } else if (key === 'arrowright') {
        event.preventDefault();
        this.video.currentTime = Math.min(this.video.duration || Infinity, this.video.currentTime + 5);
      } else if (key === 'm') {
        event.preventDefault();
        this.video.muted = !this.video.muted;
      }
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
      } else if (this.autoplay) {
        this.video.play().catch(() => {});
      }
    }

    disconnectedCallback() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      this.listeners.forEach(({ element, eventName, handler }) => {
        element.removeEventListener(eventName, handler);
      });
      this.listeners = [];

      this.video = null;
      this.playbackBtn = null;
      this.muteBtn = null;
      this.progress = null;
      this.played = null;
      this.buffered = null;
      this.currentTime = null;
      this.duration = null;
      this.timelineWrap = null;
    }
  }

  customElements.define('hero-fullscreen', HeroFullscreen);
}
