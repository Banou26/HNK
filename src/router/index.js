import { r } from '../reactivity/index.js'
import { registerRouterMixins, registerCustomElements, compileRoutes, matchRoutes as _matchRoutes } from './utils.js'

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

  const go = (replace = false) =>
    location =>
      (replace
        ? history.replaceState
        : history.pushState).call(history, {}, '', resolve(location))

  const push = go()

  const resolve = (
    location,
    url = typeof location === 'string' || location instanceof URL
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
    _url: window.location,
    set url (url) { push(this._url = resolve(url)) },
    get url () { return this._url },
    resolve,
    push,
    replace: go(true)
  })

  window.onpopstate = ev => (state.url = window.location)

  return state
}
