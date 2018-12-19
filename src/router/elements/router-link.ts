import { registerElement } from '../../elements/index'

export const RouterLinkMixin = {
  extends: 'a',
  created: (ctx, { element, attrs } = ctx) =>
    element.addEventListener('click', ev => ctx.router.push(attrs.to))
}

export default _ =>
  customElements.get('router-link') ||
  registerElement({
    name: 'router-link',
    mixins: [RouterLinkMixin]
  })
