export const OzTextNodeSymbol = Symbol.for('OzTextNode')

export class OzTextNode extends Text {
  get [OzTextNodeSymbol] () { return true }
}

export default OzTextNode
