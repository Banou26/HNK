import { registerElement } from './element.js'
import { html } from '../template/html.js'

const getRouterViewPosition = ({parentElement}, n = 0) => parentElement
  ? getRouterViewPosition(parentElement, n + parentElement instanceof RouterView ? 1 : 0)
  : n
const getRouterViewPositionElement = (route, n) => n ? getRouterViewPositionElement(route.parent, n - 1) : route

const template = ({state: {components}}) => html`${components}`

export const RouterView = customElements.get('router-view') || registerElement({
  name: 'router-view',
  props: ['name'],
  template,
  state: ctx => ({
    get components () {
      const { router: { currentRoutesComponents, currentRoute: { matched } = {} } = {}, props: { name = 'default' } } = ctx
      if (matched) {
        return currentRoutesComponents.get(matched[getRouterViewPosition(ctx.host)]/* route */)/* components */.get(name)/* component */
      }
    }
  })
})
