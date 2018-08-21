export const OzEmptyFragmentSymbol = Symbol.for('OzEmptyFragment')

export class OzEmptyFragment extends Comment {
  constructor () { super('OzEmptyFragment') }
  get [OzEmptyFragmentSymbol] () { return true }
}

export default OzEmptyFragment
