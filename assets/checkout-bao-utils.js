if (!window.BAO) {
  window.BAO = {}
}

window.BAO.utils = (function () {
  function getElement (selector, context) {
    if (context === undefined) {
      context = document
    }

    return context.querySelector(selector)
  }

  function getElements (selector, context) {
    if (context === undefined) {
      context = document
    }

    const items = context.querySelectorAll(selector)

    return Array.from(items)
  }

  return {
    getElement,
    getElements,
  }
})()
