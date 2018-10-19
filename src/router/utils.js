import pathToRegexp, { compile } from 'path-to-regexp'
import { mixin, mixins, OzElement, OzElementContext } from '../elements/utils.js'
import { registerRouterView } from './elements/index.js'

const routerGlobalMixin = {
  created: (ctx, closestOzElementParent = getClosestOzElementParent(ctx.element)) =>
    (ctx.router = closestOzElementParent && closestOzElementParent[OzElementContext].router)
}

export const registerRouterMixins = _ =>
  mixins.includes(routerGlobalMixin) ||
  mixin(routerGlobalMixin)

export const registerCustomElements = _ =>
  registerRouterView()

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

export const getClosestOzElementParent = (
  node,
  parentNode = node.parentNode || node.host,
  isOzElement = parentNode && parentNode[OzElement]
) =>
  isOzElement
    ? parentNode
    : parentNode && getClosestOzElementParent(parentNode)
