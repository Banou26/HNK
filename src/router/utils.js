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

// const makeRoute = ({ path, params, hash, fullPath, matched, name, redirectedFrom }) => ({

// })

const makeRoute = ({ record, location, redirectedFrom, router }) => ({
  location,
  fullPath,
  matched,
  name,
  redirectedFrom
})

export const _flattenRoutes = (routes, __path = '', parent) => {
  let map = new Map()
  for (const route of routes) {
    const { path, children } = route
    const childPath = __path + path
    const keys = []
    const _route = {...route, ...parent && {parent}, keys, regex: pathToRegexp(childPath, keys), toPath: compile(childPath)}
    map.set(childPath, _route)
    if (children) {
      for (const [_path, child] of flattenRoutes(children, childPath, _route)) {
        map.set(_path, child)
      }
    }
  }
  return map
}

// const normalizePath = (path, parent, strict) => {
//   if (!strict) path = path.replace(/\/$/, '')
//   if (path[0] === '/') return path
//   if (parent == null) return path
//   return `${parent.path}/${path}`.replace(/\/\//g, '/')
// }

export const flattenRoutes = ({routes, path = '', parent, map = new Map()}) =>
  routes.forEach(route => {
    const pathToRegexpOptions = route.pathToRegexpOptions || {}
    const keys = []
    const childPath = `${path}${route.path ? `${path ? '/' : ''}${route.path}` : '?'}`
    // const normalizedPath = normalizePath(route.path, {path}, pathToRegexpOptions.strict)
    console.log(childPath)
    const obj = {...childPath, ...parent && {parent}, keys, regex: pathToRegexp(childPath, [], pathToRegexpOptions), toPath: compile(childPath)}
    map.set(childPath, obj)
    route.children && flattenRoutes({routes: route.children, path: childPath, parent: obj, map})
  }) ||
  map

export const getClosestOzElementParent = (node, parentNode = node.parentNode || node.host, isOzElement = parentNode && parentNode[OzElement]) =>
  isOzElement
    ? parentNode
    : parentNode && getClosestOzElementParent(parentNode)
