const symbolPrefix = '__ozjs-list-tag-prop-symbol__'
const symbols = []

export const list = new Proxy((strArr, ...args) => list => {
  let resolvedSymbols = []
  let listResult = list.map((elem, elemIndex) => {
    return strArr.map((str, index) => {
      if (!args[index]) return str
      let result = str
      if (typeof args[index] === 'symbol' && symbols.includes(args[index])) {
        result += elem[Symbol.keyFor(args[index]).slice(symbolPrefix.length)]
        resolvedSymbols.push(args[index])
      } else if (args[index] && index !== 'raw') {
        result += args[index]
      }
      return result
    }).join('')
  }).join('')
  resolvedSymbols.map(symbol => symbols.splice(symbols.indexOf(symbol, 1)))
  return listResult
}, {
  get (target, prop, receiver) {
    let symbol = Symbol.for(symbolPrefix + prop)
    symbols.push(symbol)
    return symbol
  }
})
