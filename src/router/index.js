import { r } from '../reactivity/index.js'
import { registerRouterMixins, registerCustomElements, compileRoutes, matchRoutes as _matchRoutes } from './utils.js'
export { RouterViewMixin } from './elements/index.js'

export {
  registerRouterMixins
}

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
      isNaN(location)
        ? (replace
          ? window.history.replaceState
          : window.history.pushState).call(window.history, { history: [], index: undefined }, '', (router._url = resolve(location)))
        : undefined // window.history.go(Number(location))

  const push = go()

  const resolve = (
    location,
    url =
    typeof location === 'string' ||
    location instanceof URL ||
    location instanceof window.Location
      ? new URL(location, window.location)
      : new URL(`${(
        location.route ||
        routes.find(({name}) => name === location.name)
      ).resolve(location.params)
      }${
        new URLSearchParams(location.query).toString()
      }${
        location.hash
          ? `#${location.hash}`
          : ''
      }`, window.location)) =>
    url.pathname.startsWith(base.pathname)
      ? url
      : new URL(url.pathname, base)

  const router = r({
    routes,
    matchRoutes,
    _url: new URL(window.location),
    set url (url) { return push(this._url = resolve(url)) && url },
    get url () { return this._url },
    resolve,
    push,
    replace: go(true),
    get index () {

    },
    get length () {

    }
  })

  window.onpopstate = ev => router.replace(window.location)

  return router
}
