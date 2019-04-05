# Element

## Introduction

Element work on top of [Custom Elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements) with templates([html](https://github.com/fkn48/hnk/tree/master/packages/html), [css](https://github.com/fkn48/hnk/tree/master/packages/css), ...) and [hooks](https://github.com/fkn48/hnk/tree/master/packages/hooks)

```js
import { Element, useState, html } from 'hnk'

const Example = Element({ name: 'app-button', extends: 'button' }, () => {
  const [ count, setCount ] = useState(0)
  
  return html`\
    <app-button onClick=${() => setCount(count + 1)}>
      Click me to increase this number: ${count}
    </app-button>`
})

document.body.appendChild(Example)
```
