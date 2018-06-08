import { indexPlaceholders, regex as placeholderRegex, split, placeholder as placeholderStr, mergeSplitWithPlaceholders } from './utils.js'
import parse from './parser.js'

const createBuild = ({id, css, placeholders: _placeholders}) => {
  const style = document.createElement('style')
  template.innerHTML = css
  if (!template.content.childNodes.length) template.content.appendChild(new Comment())
  const placeholders = getPlaceholderWithPaths(template.content, _placeholders)
  return values => {
    const _createInstance = createInstance.bind(undefined, { id, template, placeholders }, ...values)
    _createInstance.build = true
    _createInstance.id = id
    _createInstance.values = values
    return _createInstance
  }
}

const cache = new Map()

export const cssTemplate = transform => (strings, ...values) => {
  if (typeof strings === 'string') strings = [strings]
  const id = 'css' + strings.join(placeholderStr(''))
  if (cache.has(id)) return cache.get(id)(values)
  // const { css, placeholders } = parse({cssArray: split(transform(mergeSplitWithPlaceholders(strings))).filter((str, i) => !(i % 2)), values})
  // const ast = parse(mergeSplitWithPlaceholders(strings))
  // console.log(ast)
  // const placeholdersWithFixedTextPlaceholders = placeholders.reduce((arr, placeholder) => [...arr,
  //   ...placeholder.type === 'text'
  //   ? placeholder.indexes.map(index => ({ type: 'text', indexes: [index], split: ['', index, ''] }))
  //   : [placeholder]
  // ], [])
  // const build = createBuild({ id, css, placeholders: placeholdersWithFixedTextPlaceholders })
  // cache.set(id, build)
  // return build(values)
}

export const css = cssTemplate(str => str)


console.dir(css`

bruh:before {
  content: " yayaya { lul }";
}

.polling_message --bruh {
  color: white;
  float: left;
  margin-right: 2%;         
}

.view_port {
  background-color: black;
  height: 25px;
  width: 100%;
  overflow: hidden;
}

.cylon_eye {
  background-color: red;
  background-image: linear-gradient(to right,
      rgba(0, 0, 0, .9) 25%,
      rgba(0, 0, 0, .1) 50%,
      rgba(0, 0, 0, .9) 75%);
  color: white;
  height: 100%;
  width: 20%;

          animation: 4s linear 0s infinite alternate move_eye;
}
@keyframes move_eye { bruh dude { margin-left: -20%; } to { margin-left: 100%; }  }`)