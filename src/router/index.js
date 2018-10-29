import { r } from '../reactivity/index.js'
import { registerRouterMixins, registerCustomElements, compileRoutes, matchRoutes as _matchRoutes } from './utils.js'
export { RouterViewMixin } from './elements/index.js'

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
  _: routes = compileRoutes({routes: _routes}),
  matchRoutes = _matchRoutes(routes)
} = {}) => {
  registerRouterMixins()
  registerCustomElements()

  let _state

  const go = (replace = false) =>
    location =>
      isNaN(location)
        ? (replace
          ? history.replaceState
          : history.pushState).call(history, {}, '', (_state._url = resolve(location)))
        : undefined // history.go(Number(location))

  const push = go()

  const resolve = (
    location,
    url = typeof location === 'string' || location instanceof URL || location instanceof window.Location
      ? new URL(location, window.location)
      : new URL(`${(
        location.route ||
        routes.find(({name}) => name === location.route.name)
      ).resolve(location.params)
      }${
        new URLSearchParams(location.query).toString()
      }#${
        location.hash
      }`, window.location)) =>
    url.pathname.startsWith(base.pathname)
      ? url
      : new URL(url.pathname, base)

  const state = r({
    routes,
    matchRoutes,
    _url: new URL(window.location),
    set url (url) { return push(this._url = resolve(url)) && url },
    get url () { return this._url },
    resolve,
    push,
    replace: go(true)
  })
  _state = state

  window.onpopstate = ev => state.replace(window.location)

  return state
}
