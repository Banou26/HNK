import { registerElement } from './element.js'
import { html } from '../template/html.js'

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

const template = ({state: {components}}) => {
  const elems = []
  if (components) {
    for (const Component of components) elems.push(new (customElements.get(Component.name))())
  }
  return html`${elems.length ? elems : ''}`
}

export const RouterView = customElements.get('router-view') || registerElement({
  name: 'router-view',
  template,
  state: ctx => ({
    get components () {
      const {router, host} = ctx
      return router && router.currentRoute.matched && getRouteConfigNthParent(router.currentRoute.matched.components, nthRouterView(host))
    }
  }),
  props: ['$router']
})
