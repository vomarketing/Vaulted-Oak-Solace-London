if (!window.BAO) {
  window.BAO = {}
}

window.BAO.Checkout = (function () {
  function Checkout (config) {
    this.config = config
    this.classes = window.BAO.utils.classes

    this.addListeners()
  }

  Checkout.prototype.addListeners = function addListeners () {
    this.listeners = new window.BAO.Listeners()

    this.onDomLoad = this.onDomLoad.bind(this)
    this.onPageLoad = this.onPageLoad.bind(this)

    this.listeners.add(document, 'DOMContentLoaded', this.onDomLoad)
    this.listeners.add(document, 'page:load', this.onPageLoad)
  }

  Checkout.prototype.onDomLoad = function onDomLoad (e) {
    if (this.config.onDomLoad !== undefined) {
      this.config.onDomLoad(e)
    }
  }

  Checkout.prototype.onPageLoad = function onPageLoad (e) {
    if (this.config.onPageLoad !== undefined) {
      this.config.onPageLoad(e)
    }
  }

  return Checkout
})()
