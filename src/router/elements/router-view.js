import { registerElement } from '../../elements/index.js'
import { html } from '../../template/html/index.js'

const RouterView = Symbol.for('RouterView')

const getRouterViewPosition = ({parentElement}, n = 0) =>
  parentElement
    ? getRouterViewPosition(parentElement, n + (RouterView in parentElement ? 1 : 0))
    : n
const getRouterViewPositionElement = (route, n) =>
  n
    ? getRouterViewPositionElement(route.parent, n - 1)
    : route

export const RouterViewMixin = {
  props: ['name'],
  state: ctx => ({
    get components () {
      const { router: { currentRoutesComponents, currentRoute: { matched } = {} } = {}, props: { name = 'default' } } = ctx
      if (matched) {
        const routeConfig = matched[getRouterViewPosition(ctx.host)]
        // todo: manage the stuff with selecting router-view name prop ect
        return [...currentRoutesComponents.has(routeConfig) && currentRoutesComponents.get(routeConfig).values()]/* components */
        // return currentRoutesComponents.has(routeConfig) && currentRoutesComponents.get(routeConfig)/* components */.get(name)/* component */
      }
    }
  }),
  created ({element}) {
    element[RouterView] = true
  }
}

export default _ => {
  customElements.get('router-view') || registerElement({
    name: 'router-view',
    template: ({state: {components}}) => html`${components}`,
    mixins: [RouterViewMixin]
  })
}
