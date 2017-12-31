import { Element } from './element.js'
import { html } from '../template/html'

const nthRouterView = routerView => {
  let nth = 0
  let elem = routerView.parentElement
  while (elem) {
    if (elem instanceof RouterView && elem.router === routerView.router) nth++
    elem = elem.parentElement
  }
  return nth
}

const getRouteConfigNthParent = (routeConfig, nth) => {
  let elem = routeConfig
  while (nth) {
    elem = elem.parent
    nth--
  }
  return elem
}

export class RouterView extends Element {
  constructor (router) {
    super({router})
  }

  set router (router) {
    this.state.router = router
    super.router = router
  }

  get router () {
    return this.state.router
  }

  get components () {
    return this.state.components
  }

  state () {
    const _this = this
    return {
      router: null,
      get components () {
        return this.router && this.router.currentRoute.matched && getRouteConfigNthParent(this.router.currentRoute.matched.components, nthRouterView(_this))
      }
    }
  }

  static template ({router, components}) {
    const elems = []
    if (router && components) {
      for (const Component of components) elems.push(new Component({router: router}))
    }
    return html`${elems.length ? elems : ''}`
  }
}
