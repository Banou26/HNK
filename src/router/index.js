import { reactify, defaultReactiveRoot } from '../index.js'
import pathToRegexp from '../libs/path-to-regexp.js'

export const Router = class OzRouter {
  constructor (options = {}, reactiveRoot = defaultReactiveRoot) {
    this.options = options
    this.state = reactify({
      routes: options.routes,
      matched: null
    })
  }

  set options (options) {
    this._options = options
  }

  get options () {
    return this._options
  }

  set state (state) {
    this._state = state
  }

  get state () {
    return this._state
  }

  set params (params) {
    this._params = params
  }

  get params () {
    return this._params
  }

  set queries (queries) {
    this._queries = queries
  }

  get queries () {
    return this._queries
  }

  go (num) {

  }

  push (data) {
    if (typeof data === 'string') {

    } else if (data && typeof data === 'object') {

    }
  }

  replace () {
    
  }
}
