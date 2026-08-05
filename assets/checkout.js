;(function () {
  function SolaceCheckout (config) {
    this.checkout = new window.BAO.Checkout(Object.assign({}, config))
    this.config = config
  }

  window.BAO.SolaceCheckout = new SolaceCheckout({
    onDomLoad: function onDomLoad (e) {},
    onPageLoad: function onPageLoad (e) {},
  })
})()
