import { registerElement } from '../../elements/index.js'
import { html } from '../../template/html/index.js'
import { getClosestOzElementParent } from '../../utils.js'

const RouterView = Symbol.for('RouterView')

const getClosestRouterView = (
  node,
  closestOzElementParent = getClosestOzElementParent(node),
  isRouter = closestOzElementParent && RouterView in closestOzElementParent
) =>
  isRouter
    ? closestOzElementParent
    : closestOzElementParent && getClosestRouterView(closestOzElementParent)

// TODO(reactivity optimisation): find why there's 3 first renders instead of just 1, it has to do with the reactivity & the dependency chain:
// matches -> route -> content, maybe calling the template everytime, it should only be called 1 time at the first render
export const RouterViewMixin = {
  props: ctx => ({
    [RouterView]: true,
    get route () {
      return ctx.state.route
    },
    get childPathname () {
      return ctx.state.childPathname
    }
  }),
  state: ctx => ({
    get url () { return (getClosestRouterView(ctx.element)?.childPathname || ctx.router?.url) },
    get pathname () { return this.url?.pathname },
    get matches () { return this.url && ctx.router?.matchRoutes(this.url) },
    get route () { return this.matches?.[0] },
    get content () {
      const content = this.route?.content
      return typeof content === 'function' && !content?.prototype
        ? content().then(module => module.default)
        : content
    },
    get childPathname () { return this.pathname?.replace?.(this.route?.regex, '') }
  }),
  template: ({ state: { content } }) => html`${content}`
}

export default _ =>
  customElements.get('router-view') ||
  registerElement({
    name: 'router-view',
    mixins: [RouterViewMixin]
  })
