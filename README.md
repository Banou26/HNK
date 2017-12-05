# oz.js
<!-- A Javascript framework made for any project size on web -->
Oz(oz.js) goal is to enable developers to use the latest features on the web to make powerful apps of any size

To see more documentation/examples you can go on [oz.js website](https://js.ozapp.io)(down, WIP)

## Overview

Oz currently weight 4kb minified/gzip'd, you can split it's weight by using only features that you need, reactivity(700bytes)/html template(~2kb)/ css template(-500bytes)

Oz provide multiples exports:

- [x] `Element` which is the component that allow you to create OzElements which allow you to use any other parts of the framework, it uses the WebComponent API
- [x] `reactify` is used to create a reactive object, on which you can register listeners
- [x] `html` can be used as a standalone library or with an OzElement to create HTML templates
- [x] `css` (WIP) same as `html` but with css

Oz will also support future features like

- [ ] `router`  allow your OzElements to adopt specifics behaviors in function of their placement in the app route hierarchy
- [ ] `store` allow your OzElements to use a reactive object that will contain your application state
- [ ] `pug` to get rid of the verbose html syntax when using templates in the element tag
  ```pug
  ${'my'}-${'custom'}-element myText
  ```
  instead of
  ```
  <${'my'}-${'custom'}-element>
  	myText
  </${'my'}-${'custom'}-element>
  ```

```js
import { Element, html, css } from './oz.js'
class CustomElement extends Element {
  state () {
    return {
      foo: 'foo',
      bar: 'bar',
      get foobar () {
        return this.foo + this.bar
      },
      class1Color: 'red'
    }
  }

  static template ({ foo, foobar, bar }) {
    return html`
    <div class="class1">
      ${foo}
      ${foobar}
      ${bar}
    </div>`
  }

  static style ({ class1Color }) {
    return css`
    class1 {
      color: ${class1Color};
    }`
  }
}
customElements.define('custom-element', CustomElement)
const elem = document.createElement('custom-element')
```

## Reactivity
To create a reactive object, it's as simple as:
```js
import { reactify } from './oz.js'
const react = reactify()
```
A reactive object can be an object or an array.

You can also get a reactive copy of an object passing this object as first argument.
```js
import { reactify } from './oz.js'
const react = reactify({
  foo: 'bar',
  get baz () {
  	return this.bar || this.foo
  }
})
const reactArr = reactify([1 ,2, 3])
```
You can then listen to the changes done on properties accessed by the getter function (first argument).
```js
react.$watch(function() {
  return this.foo
}, (newValue, oldValue) => {
  console.log(newValue, oldValue)
})
react.foo = 'baz'
// baz bar
```
The new and old values are the values returned by the getter function

You can also listen to all the changes in the reactive object by simply not passing the getter function.

Listening to an object listen property changes, addition and deletions
```js
react.$watch((newValue, oldValue) => {
  console.log(newValue, oldValue)
})
react.bar = 'foo'
```
In this case, `newValue` and `oldValue` will be the same since they are the same object reference.

Reactive object can accept getters, thoses getters can be listened to by watchers and cache the value that they return so even if your getter do heavy computations, he does the work only one time each time his dependencies change.
```js
let react = reactify({
  a: 1,
  b: 2,
  get c () {
    return this.a + this.b
  },
  get d () {
    return {
      a: this.a,
      b: this.b,
      c: this.c
    }
  }
})
const d = react.d
const d2 = react.d
console.log(d === d2) // true
```
## HTML Template
To use the html templates, you have to use the template literal tag, html`` and you can place placeholders inside that html by using ${value}.

The template litteral will then return the build function, to create a template instance you simply call the build function, and you'll then have a template instance.
```js
import { html } from './oz.js'
let container = document.createElement('div')

const build = html`${'foo'} bar ${'foo2'} bar2 ${'foo3'} bar3`

let instance = build()
container.appendChild(instance.content)
```
This template instance exposes the `content` property that allow you to append the instance content to the DOM.

The instance also expose the `update` function that allow you to update the placeholders with new values.

```js
instance.update('bar', 'bar2', 'bar3')
```
Changes will then be applied to the elements even if they are not appended in the DOM.

Another way to update an instance is to create the same build with differents values in the placeholders, you can then update the instance with the build values. Since builds are cached, the creation of the same build is almost free.
```js
const newBuild = html`${'baz'} bar ${'baz2'} bar2 ${'baz3'} bar3`
const buildValues = newBuild.values
instance.update(...values)
```

You can place placeholders wherever you want in your html if the value that you set is valid.

HTML templates accept, other HTML templates, nodes, arrays, functions, primitives.

You can then do heavily-dynamic templates like
```js
html`
${'foo'} bar ${'foo2'} bar2 ${'foo3'} bar3

<!-- ${'foo'} bar ${'foo2'} bar2 ${'foo3'} bar3 -->

<${'div'} at${'tr'}="foo ${'bar'}" pr${'op'}=${propValue}>${'text'}

  <div>
  
  	${['foo2', new Comment('bar2'), document.createElement('span')]}
    
  </div>
  
</${'div'}>
`
```

(WIP)