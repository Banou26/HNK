/* globals HTMLElement */

export const registerElement = element => {
  const {
    name,
    extends: extend,
    shadowDom,
    state,
    props,
    methods,
    watchers,
    template: buildTemplate,
    style: buildStyle,
    created,
    connected,
    disconnected
  } = element
  const Class = extend ? Object.getPrototypeOf(document.createElement(extend)).constructor : HTMLElement
  class OzElement extends Class {
    constructor () {
      super()
    }
  }
}
