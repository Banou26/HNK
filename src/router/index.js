import { r } from '../reactivity/index.js'
import { registerRouterMixins, registerCustomElements, flattenRoutes } from './utils.js'

export {
  registerRouterMixins
}

const history = window.history

export const Router = ({
  routes: _routes,
  base: _base = '',
  linkActiveClass = 'linkActiveClass',
  linkExactActiveClass = 'linkExactActiveClass',
  base = new URL(_base, window.location.origin),
  _: routes = flattenRoutes({routes: _routes})
} = {}) => {
  registerRouterMixins()
  registerCustomElements()

  console.log(routes)

  const resolve = (location, current = this.currentRoute, append = false) => {}

  const go = (replace = false) =>
    (location, url = typeof location === 'string' ? location : undefined) =>
      (replace
        ? history.replaceState
        : history.pushState).call(history, {}, '', new URL(url, base.href))

  return r({
    resolve,
    push: go(),
    replace: go(true)
  })
}
