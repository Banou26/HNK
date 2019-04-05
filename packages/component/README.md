# Component

## Introduction

Components use templates([html](https://github.com/fkn48/hnk/tree/master/packages/html), [css](https://github.com/fkn48/hnk/tree/master/packages/css), ...) and  [hooks](https://github.com/fkn48/hnk/tree/master/packages/hooks)

```js
import { Component, useState, html } from 'hnk'

const Example = Component(() => {
  const [ count, setCount ] = useState(0)
  
  return html`\
    <div>
      <p>You clicked ${count} times</p>
      <button onClick=${() => setCount(count + 1)}>
        Click me
      </button>
    </div>`
})

document.body.appendChild(Example)
```
