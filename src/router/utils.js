import pathToRegexp, { compile } from 'path-to-regexp'
import { mixin, OzElement, OzElementContext } from '../elements/index.js'
import { registerRouterView } from './elements/index.js'

let mixinRegistered, customElementsRegistered

export const registerRouterMixins = _ =>
  mixinRegistered
    ? undefined
    : (mixinRegistered = true) &&
      mixin({
        created: (ctx, closestOzElementParent = getClosestOzElementParent(ctx.element)) =>
          (ctx.router = closestOzElementParent && closestOzElementParent[OzElementContext].router)
      })

export const registerCustomElements = _ =>
  customElementsRegistered
    ? undefined
    : (customElementsRegistered = true) &&
      registerRouterView()

export const compileRoutes = ({routes = []} = {}) =>
  routes
    .map(route => ({
      ...route,
      regex: pathToRegexp(route.path, [], { end: false }),
      resolve: ((toPath, params) => toPath(params)).bind(undefined, compile(route.path))
    }))

export const matchRoutes = routes => url =>
  routes.filter(({regex}) => regex.test(url.pathname))

export const getClosestOzElementParent = (node, parentNode = node.parentNode || node.host, isOzElement = parentNode && parentNode[OzElement]) =>
  isOzElement
    ? parentNode
    : parentNode && getClosestOzElementParent(parentNode)
