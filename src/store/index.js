import { getClosestOzElementParent } from '../utils.js'
import { mixin, mixins, OzElementContext } from '../elements/utils.js'

const storeGlobalMixin = {
  beforeConnected: (ctx, closestOzElementParent = getClosestOzElementParent(ctx.element)) =>
    (ctx.store = closestOzElementParent && closestOzElementParent[OzElementContext].store)
}
export const registerStoreMixins = _ =>
  mixins.includes(storeGlobalMixin) ||
  mixin(storeGlobalMixin)
