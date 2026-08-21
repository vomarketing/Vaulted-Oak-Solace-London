if (!customElements.get('three-up-slider')) {
  class ThreeUpSlider extends HTMLElement {
    constructor() {
      super();

      this.selectors = {
        swiper: '.js-swiper',
        slide: '.js-slide'
      };

      this.classes = {
        isSingle: 'is-single'
      };

      this.breakpoint = 901;

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

      const isSingle = slideCount === 1;
      this.swiperEl.classList.toggle(this.classes.isSingle, isSingle);

      this.swiper = new window.Swiper(this.swiperEl, {
        slidesPerView: isSingle ? 1 : 1.55,
        spaceBetween: 20,
        touchEventsTarget: 'container',
        watchOverflow: true,
        allowTouchMove: !isSingle,
        a11y: {
          enabled: true,
          prevSlideMessage: 'Previous slide',
          nextSlideMessage: 'Next slide',
          slideLabelMessage: '{{index}} of {{slidesLength}}',
          itemRoleDescriptionMessage: 'slide',
          containerRoleDescriptionMessage: 'image carousel'
        },
        keyboard: {
          enabled: true,
          onlyInViewport: true
        },

        breakpoints: {
          768: {
            spaceBetween: 60
          },
          901: {
            slidesPerView: isSingle ? 1 : 2,
            spaceBetween: 100
          },
          1441: {
            slidesPerView: isSingle ? 1 : 2,
            spaceBetween: 118
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

  customElements.define('three-up-slider', ThreeUpSlider);
}
