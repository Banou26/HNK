# Component

## Introduction

HTML templates allow you to append/update DOM efficiently, it's simple, intuitive and powerful, both as a standalone library, or used with HNK's other libraries

Here's how you do a simple hello world
```js
import { html } from 'hnk'

document.body.appendChild(html`Hello world!`)
```

What's really cool about HTML templates is that it leverage [Tagged template literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates) to allow you put dynamic parts into your HTML to do things like

```js
import { html } from 'hnk'

let time = 0
const template = html`Here's a timer! ${time}`

setInterval(() => template.update(time++), 1000)

document.body.appendChild(template)
```

And obviously it's not limited to only text, anything can be dynamic

- Element
   - tag name
   - attribute
   - property
   - event listener
- Node Types
  - text
  - comment

And obviously, HTML templates can be embedded into other HTML templates

Here's an ugly example showing everything you can do with HTML templates
```js
import { html } from 'hnk'

const template = html`\

${'Some dynamic text'}

<-- ${'A dynamic comment'} -->

<${'div'}></${'div'}>

<div ${'propertyName'}=${'propertyValue'}></div>

<div ${'attributeName'}="${'attributeValue'}"></div>

<-- The event listener name can also be dynamic if you want ! -->
<div onClick=${() => console.log('Clicked !')}></div>

${
  html`A HTML template in another !`
}

<-- And even an array of templates -->
${
  [1, 2, 3].map(i => html`\
    Item n°${i}
  `)
}

`

document.body.appendChild(template)
```
