if (!customElements.get('pdp-colorways')) {
  class PdpColorways extends HTMLElement {
    constructor() {
      super();

      this.selectors = {
        swiper: '.js-colorways-swiper',
        slide: '.js-colorways-slide',
        lazyImage: 'img.lazyload'
      };

      this.offsets = {
        base: 20,
        desktop: 0
      };

      this.swiperEl = null;
      this.swiper = null;
    }

    connectedCallback() {
      this.swiperEl = this.querySelector(this.selectors.swiper);
      if (!this.swiperEl) return;

      this.initSwiper();
    }

    initSwiper() {
      if (typeof window.Swiper === 'undefined') return;

      const slideCount = this.querySelectorAll(this.selectors.slide).length;
      if (slideCount === 0) return;

      this.swiper = new window.Swiper(this.swiperEl, {
        slidesPerView: 'auto',
        spaceBetween: 10,
        touchEventsTarget: 'container',
        watchOverflow: true,
        slidesOffsetBefore: this.offsets.base,
        slidesOffsetAfter: this.offsets.base,
        a11y: {
          enabled: true,
          prevSlideMessage: 'Previous colourway',
          nextSlideMessage: 'Next colourway',
          slideLabelMessage: '{{index}} of {{slidesLength}}',
          itemRoleDescriptionMessage: 'colourway',
          containerRoleDescriptionMessage: 'colourway carousel'
        },
        keyboard: {
          enabled: true,
          onlyInViewport: true
        },

        breakpoints: {
          901: {
            slidesOffsetBefore: this.offsets.desktop,
            slidesOffsetAfter: this.offsets.desktop
          }
        }
      });
    }

    disconnectedCallback() {
      if (this.swiper) {
        this.swiper.destroy(true, true);
        this.swiper = null;
      }

      this.swiperEl = null;
    }
  }

  customElements.define('pdp-colorways', PdpColorways);
}
