import { getClosestOzElementParent } from '../utils'
import { mixin, mixins, OzElementContext } from '../elements/utils'

const storeGlobalMixin = {
  beforeConnected: (ctx, closestOzElementParent = getClosestOzElementParent(ctx.element)) =>
    (ctx.store = closestOzElementParent && closestOzElementParent[OzElementContext].store)
}
export const registerStoreMixins = _ =>
  mixins.includes(storeGlobalMixin) ||
  mixin(storeGlobalMixin)
