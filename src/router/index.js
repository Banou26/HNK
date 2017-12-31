import { reactify } from '../reactivity/index.js'
import pathToRegexp from '../libs/path-to-regexp.js'
import { cloneObject } from '../util/index.js'

const flattenRoutes = (routes, __path = '', parent) => {
  let map = new Map()
  for (const route of routes) {
    const { path, children } = route
    const childPath = __path + path
    const keys = []
    const _route = {...cloneObject(route), ...parent && {parent}, keys, regex: pathToRegexp(childPath, keys)}
    map.set(childPath, _route)
    if (children) {
      for (const [_path, child] of flattenRoutes(children, childPath, _route)) {
        map.set(_path, child)
      }
    }
  }
  return map
}

export const Router = class OzRouter {
  constructor (config = {}, options = {}) {
    this.config = config
    this.options = options
    this.routes = config.routes ? flattenRoutes(config.routes) : new Map()
    this.fullPath = location.href
    this.push(location.href)
    return reactify(this)
  }

  get url () {
    return new URL(this.fullPath)
  }

  get path () {
    return this.url.pathname
  }

  get hash () {
    return this.url.hash
  }

  get query () {
    const query = {}
    for (const [key, value] of this.url.searchParams) query[key] = value
    return query
  }

  get params () {
    for (const [, route] of this.routes) {
      const match = route.regex.exec(this.url.pathname)
      if (match) {
        const params = {}
        for (const i in route.keys) {
          const key = route.keys[i]
          params[key.name] = match[i + 1]
        }
        return params
      }
    }
  }

  get matched () {
    for (const [, route] of this.routes) {
      const match = route.regex.exec(this.url.pathname)
      if (match) return route
    }
  }

  get name () {
    return this.matched.name
  }

  get currentRoute () {
    const {path, fullPath, query, params, hash, matched, name} = this
    return {path, fullPath, query, params, hash, matched, name}
  }

  match (url) {

  }

  back () {
    return this.go(-1)
  }

  forward () {
    return this.go(1)
  }

  go (num) {
    return window.history.go(num)
  }

  push (url) {
    const result = window.history.pushState({}, '', url)
    this.fullPath = location.href
    return result
  }

  replace (url) {
    return window.history.replaceState({}, '', url)
  }
}
