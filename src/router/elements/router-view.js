import { registerElement } from '../../elements/index.js'
import { html } from '../../template/html/index.js'
import { getClosestOzElementParent } from '../utils.js'

const RouterView = Symbol.for('RouterView')

const getClosestRouterView = (
  node,
  closestOzElementParent = getClosestOzElementParent(node),
  isRouter = closestOzElementParent && RouterView in closestOzElementParent
) =>
  isRouter
    ? closestOzElementParent
    : closestOzElementParent && getClosestRouterView(closestOzElementParent)

export const RouterViewMixin = {
  props: ['name'],
  state: ctx => ({
    get url () { return (getClosestRouterView(ctx.element)?.childPathname || ctx.router?.url) },
    get pathname () { return this.url?.pathname },
    get matches () { return this.url && ctx.router?.matchRoutes(this.url) },
    get route () { return this.matches?.[0] },
    get content () { return this.route?.content },
    get childPathname () { return this.pathname?.replace?.(this.route?.regex, '') }
  }),
  template: ({ state: { content } }) => html`${content}`,
  created ({element}) { element[RouterView] = true },
  watchers: [
    ({ element, state: { route }}) => (element.route = route),
    ({ element, state: { childPathname }}) => (element.childPathname = childPathname)
  ]
}

export default _ =>
  customElements.get('router-view') ||
  registerElement({
    name: 'router-view',
    mixins: [RouterViewMixin]
  })
