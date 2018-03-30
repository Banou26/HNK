import { mixin, pushContext } from '../elements/index.js'
import { reactify } from '../reactivity/index.js'
import pathToRegexp, { compile } from '../libs/path-to-regexp.js'
import { cloneObject, flattenArray } from '../utils.js'

mixin(({context, parentContext, options}) => {
  // console.log('mixin', context, parentContext)
  if (options && options.router) {
    context.router = options.router
    context.router.__rootElementContext__ = context
  } else if (parentContext && parentContext.router) context.router = parentContext.router
})

const flattenRoutes = (routes, __path = '', parent) => {
  let map = new Map()
  for (const route of routes) {
    const { path, children } = route
    const childPath = __path + path
    const keys = []
    const _route = {...cloneObject(route), ...parent && {parent}, keys, regex: pathToRegexp(childPath, keys), toPath: compile(childPath)}
    map.set(childPath, _route)
    if (children) {
      for (const [_path, child] of flattenRoutes(children, childPath, _route)) {
        map.set(_path, child)
      }
    }
  }
  return map
}

const getRouterViewPositionElement = (route, n) => n ? getRouterViewPositionElement(route.parent, n - 1) : route

// const createComponents = components => components.map(Component => document.createElement(Component.name))

// const getRouteComponents = route =>
//   Object.entries((route.components || {}))
//     .reduce((components, [Component, name]) => ({...components, [name]: Component}), {...route.component ? {default: route.component} : {}})

const getRouteComponents = route => [...route.component ? [['default', route.component]] : [], ...route.components ? Object.entries(route.components) : []]

const createRouteComponents = route => new Map([...getRouteComponents(route)].map(([name, Component]) => ([name, document.createElement(Component.name)])))

// const getRouteComponents = matched => new Map(Object.entries((matched.components || {})).map(([Component, name]) => [name, Component]))

// const createComponents = components =>
//   Object.entries(components)
//     .reduce((components, [Component, name]) => ({...components, [name]: document.createElement(Component.name)}), {})

// const createRouteComponents = components => new Map(Object.entries(components).map(([Component, name]) => ([name, document.createElement(Component.name)])))

const flattenRoute = (route, arr = [route]) => route.parent ? flattenRoute(route.parent, [route.parent, ...arr]) : arr

export const Router = options => {
  const base = '/' + (options.base || '').replace(/^\//g, '')
  const originBase = window.location.origin + base
  const flattenedRoutes = options.routes ? flattenRoutes(options.routes) : undefined
  const state = reactify({
    fullPath: location.href,
    routes: flattenedRoutes || new Map(),
    routesComponentsConstructors: new Map([...flattenedRoutes].map(([route]) => [route, getRouteComponents(route)])),
    base,
    currentRoute: undefined,
    currentRoutesComponents: new Map()
  })

  let beforeEachGuards = []
  let beforeResolveGuards = []
  let afterEachHooks = []

  const matchPath = path => [...state.routes].find(([, route]) => route.regex.exec(path))
  const matchName = name => [...state.routes].find(([, route]) => route.name === name)

  const resolve = (to, { append, relative } = {}) => {
    const { origin, pathname } = window.location
    const _base = append || relative ? origin + pathname : originBase
    const isString = typeof to === 'string' // ?
    const { name, path, params, query = [] } = to || {} // ?
    const [, route] = isString
      ? matchPath(to)
      : name
        ? matchName(name)
        : matchPath(path)
    return {
      route,
      url: isString
        ? new URL(to, _base)
        : new URL(`${path || route.toPath(params)}?${query.map((val, key) => `${key}=${val}`).join('&')}`, _base)
    }
  }

  const goTo = async (replace, to) => {
    const { url, route } = resolve(to)
    const matched = flattenRoute(route)
    const { currentRoutesComponents, currentRoute } = state
    console.log('state', state, currentRoutesComponents)
    const newRoute = {
      url,
      path: url.pathname,
      params: (route.regex.exec(url.pathname).filter((item, i) => i) || []).reduce((params, val, i) => ({...params, [route.keys[i].name]: val}), {}),
      query: [...url.searchParams],
      hash: url.hash,
      fullPath: url.href,
      matched,
      __rootElementContext__: undefined
    }
    const activatedRoutes = currentRoute ? matched.filter(route => !currentRoute.matched.includes(route)) : matched
    const reusedRoutes = currentRoute ? matched.filter(route => currentRoute.matched.includes(route)) : []
    const deactivatedRoutes = currentRoute ? currentRoute.matched.filter(route => !matched.includes(route)) : []

    const reusedComponents = new Map(reusedRoutes.map(route => [route, [...state.currentRoutesComponents.get(route).values()]]))
    const deactivatedComponents = new Map(deactivatedRoutes.map(route => [route, [...state.currentRoutesComponents.get(route).values()]]))

    const abortResults = (results, guardFunctionName, reverse) => {
      const abort = results.find(result => reverse ? !result : result)
      if (abort) throw new Error(`OzRouter: naviguation aborted, ${guardFunctionName} returned:\n${JSON.stringify(abort)}`)
    }

    const callComponentsGuards = async (components, guardFunctionName) => {
      console.log('components', components)
      abortResults(await Promise.all(components.map(component => {
        console.log('component', component)
        const { __context__: context } = component
        if (!component[guardFunctionName]) return
        return /* currentRoutesComponents.get(component) */component[guardFunctionName](context || newRoute, context ? newRoute : currentRoute, context ? currentRoute : undefined)
      }).filter(elem => elem)), guardFunctionName)
    }
    console.log(deactivatedComponents)
    await callComponentsGuards(flattenArray([...deactivatedComponents.values()]), 'beforeRouteLeave')

    const beforeEachAbort = (await Promise.all(beforeEachGuards.map(guard => guard(newRoute, currentRoute)))).find(result => result)
    if (beforeEachAbort) throw new Error(`OzRouter: naviguation aborted, beforeEach returned:\n${JSON.stringify(beforeEachAbort)}`)

    await callComponentsGuards(flattenArray([...reusedComponents.values()]), 'beforeRouteUpdate')

    if (route.beforeEnter) {
      const abort = await route.beforeEnter(newRoute, currentRoute)
      if (abort) throw new Error(`OzRouter: naviguation aborted, beforeEnter returned:\n${JSON.stringify(abort)}`)
    }

    // todo: async route components ?

    abortResults(await Promise.all(flattenArray(activatedRoutes.map(route =>
      [...getRouteComponents(route)]
      .filter(Component => Object.getPrototypeOf(Component).beforeRouteEnter)
      .map(Component => Object.getPrototypeOf(Component).beforeRouteEnter.apply(null, null, newRoute, currentRoute))
    ))), 'beforeRouteEnter', true)

    const activatedComponents = pushContext(state.___rootElementContext__, _ => new Map(activatedRoutes.map(route => [route, createRouteComponents(route)])))

    state.currentRoutesComponents = new Map([...reusedComponents, ...activatedComponents])
    // console.log('state.currentRoutesComponents', state.currentRoutesComponents)
    const beforeResolveAbort = (await Promise.all(beforeResolveGuards.map(guard => guard(newRoute, currentRoute)))).find(result => result)
    if (beforeResolveAbort) throw new Error(`OzRouter: naviguation aborted, beforeResolve returned:\n${JSON.stringify(beforeResolveAbort)}`)

    state.currentRoute = newRoute
    window.history[replace ? 'replaceState' : 'pushState']({}, '', newRoute.fullPath)

    afterEachHooks.forEach(hook => hook(newRoute, currentRoute))
  }

  const router = reactify({
    set __rootElementContext__ (__rootElementContext__) { state.___rootElementContext__ = __rootElementContext__ },
    get __rootElementContext__ () { return state.___rootElementContext__ },
    get url () { return new URL(state.fullPath) },
    get path () { return router.url.pathname },
    get hash () { return router.url.hash },

    get query () {
      const query = {}
      for (const [key, value] of router.url.searchParams) query[key] = value
      return query
    },
    get params () {
      for (const [, route] of state.routes) {
        const match = route.regex.exec(router.url.pathname)
        if (match) {
          const params = {}
          for (const i in route.keys) {
            const key = route.keys[i]
            params[key.name] = match[i + 1]
          }
          return params
        }
      }
    },
    get matched () {
      for (const [, route] of state.routes) {
        const match = route.regex.exec(router.url.pathname)
        if (match) return route
      }
    },
    get name () {
      return router.matched && router.matched.name
    },
    get currentRoute () {
      return state.currentRoute
    },
    get currentRoutesComponents () {
      return state.currentRoutesComponents
    },
    match (location) {
      if (typeof location === 'object') {

      } else {

      }
    },
    back () {
      return router.go(-1)
    },
    forward () {
      return router.go(1)
    },
    go (num) {
      return window.history.go(num)
    },
    push: goTo.bind(null, false),
    replace: goTo.bind(null, true)
  })
  router.replace(location.pathname)
  return router
}
