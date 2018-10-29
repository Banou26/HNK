import pathToRegexp, { compile } from 'path-to-regexp'
import { getClosestOzElementParent } from '../utils.js'
import { mixin, mixins, OzElementContext } from '../elements/utils.js'
import { registerRouterView, registerRouterLink } from './elements/index.js'

const routerGlobalMixin = {
  beforeConnected: (ctx, closestOzElementParent = getClosestOzElementParent(ctx.element)) =>
    (ctx.router = closestOzElementParent && closestOzElementParent[OzElementContext].router)
}

export const registerRouterMixins = _ =>
  mixins.includes(routerGlobalMixin) ||
  mixin(routerGlobalMixin)

export const registerCustomElements = _ => {
  registerRouterView()
  registerRouterLink()
}

export const compileRoutes = ({routes = []} = {}) =>
  routes
    .map(route =>
      Array.isArray(route.path)
        ? route.path.map(path => ({
          ...route,
          regex: pathToRegexp(path, [], { end: false }),
          resolve: ((toPath, params) => toPath(params)).bind(undefined, compile(path))
        }))
        : ({
          ...route,
          regex: pathToRegexp(route.path, [], { end: false }),
          resolve: ((toPath, params) => toPath(params)).bind(undefined, compile(route.path))
        })
    ).flat(Infinity)

export const matchRoutes = routes => url =>
  routes.filter(({regex}) => regex.test(url.pathname))
