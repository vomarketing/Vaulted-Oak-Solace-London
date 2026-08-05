if (!window.BAO) {
  window.BAO = {}
}

window.BAO.Listeners = (function () {
  /**
   * Returns the first element that is a descendant of node that
   * matches selectors.
   */
  function Listeners () {
    this.entries = []
  }

  /**
   * Keeps track of a listener
   *
   * @param {HTMLElement|Document} element - The element the listener is going to be attached to
   * @param {String} event - The event name we want listen for
   * @param {Function} fn - The function that will get run on the event
   */
  Listeners.prototype.add = function add (element, event, fn) {
    this.entries.push({
      element,
      event,
      fn,
    })

    element.addEventListener(event, fn)
  }

  /**
   * Stop tracking the specific event
   *
   * @param {String} event - The event name we want listen for
   * @param {Function} fn - The function that will get run on the event
   */
  Listeners.prototype.remove = function remove (event, fn) {
    const foundListener = this.entries.find(listener => {
      return listener.event === event && listener.fn === fn
    })

    if (foundListener) {
      this.entries = this.entries.filter(listener => {
        return listener !== foundListener
      })

      foundListener.element.removeEventListener(foundListener.event, foundListener.fn)
    }
  }

  /**
   * Removes all of the tracked events
   */
  Listeners.prototype.removeAll = function removeAll () {
    this.entries = this.entries.filter(listener => {
      listener.element.removeEventListener(listener.event, listener.fn)

      return false
    })
  }

  return Listeners
})()
