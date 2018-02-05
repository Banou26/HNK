import { registerElement } from './element.js'
import { html } from '../template/html.js'

const getRouterViewPosition = ({parentElement}, n = 0) => parentElement ? getRouterViewPosition(parentElement, n + 1) : n
const getNthElement = (routeConfig, n) => n ? getNthElement(routeConfig.parent, n - 1) : routeConfig

const template = ({state: {childs}}) => html`${childs}`

const createComponents = components => components && components.map(Component => document.createElement(Component.name))

export const RouterView = customElements.get('router-view') || registerElement({
  name: 'router-view',
  template,
  state: ctx => ({
    childs: undefined,
    get components () {
      const { matched } = ctx.router
      return matched && getNthElement(matched.components, getRouterViewPosition(ctx.host))
    }
  }),
  watchers: [
    [
      ({state: {components}}) => (components),
      ({state}) => (state.childs = createComponents(state.components))
    ]
  ],
  created: ({state}) => (state.childs = createComponents(state.components))
})
