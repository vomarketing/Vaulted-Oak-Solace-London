/* eslint-disable */
//startup settings
function startup (klevu) {
  var options = {
    url: {
      search: klevu.settings.url.protocol + '//eucs24.ksearchnet.com/cs/v2/search',
      landing: '/search',
      protocolFull: klevu.settings.url.protocol + '//'
    },
    localSettings: true,
    search: {
      searchBoxSelector: 'input.psh-Search_Input',
      searchBoxTarget: false,
      minChars: 1,
      placeholder: 'Search',
      showQuickOnEnter: false,
      fullPageLayoutEnabled: true,
      personalisation: false,
      redirects: [],
      apiKey: window.klevu_apiKey
    },
    analytics: {
      apiKey: window.klevu_apiKey
    }
  }

  klevu(options)
}
//once klevu is interactive, setup the settings
klevu.interactive(function () {
  startup(klevu)
})
//check if klevu is interactive and also if all necessary search instances are powered up
klevu.coreEvent.build({
  name: 'bindLocalBoxes',
  fire: function () {
    if (
      !klevu.isInteractive ||
      klevu.isUndefined(klevu.search) ||
      klevu.isUndefined(klevu.search.build) ||
      klevu.isUndefined(klevu.searchEvents) ||
      klevu.isUndefined(klevu.searchEvents.functions) ||
      klevu.isUndefined(klevu.searchEvents.functions.bindAllSearchBoxes)
    ) {
      return false
    }
    return true
  },
  maxCount: 500,
  delay: 30
})
//attach to all search boxes on the page
klevu.coreEvent.attach('bindLocalBoxes', {
  name: 'search-boxes-local-boxes',
  fire: function () {
    klevu.searchEvents.functions.bindAllSearchBoxes.fire()
  }
})
/* eslint-enable */
