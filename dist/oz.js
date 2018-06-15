'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var mensch = _interopDefault(require('mensch'));

const UUID = a => a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, UUID);

const isObject = item => item && typeof item === 'object' && !Array.isArray(item);

const flattenArray = arr => arr.reduce((arr, item) => Array.isArray(item) ? [...arr, ...flattenArray(item)] : [...arr, item], []);

const ignoreObjectTypes = [
  Error,
  WeakSet,
  WeakMap,
  Node,
  Promise
];

// todo: add more of the built-in objects, some of them are in https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const builtInObjects = new Map([
  [URL, {
    copy: url => new URL(url.href)
  }],
  [URLSearchParams, {
    copy: urlSearchParams => new URLSearchParams(urlSearchParams.toString())
  }],
  [RegExp, {
    copy: regexp => new RegExp(regexp.source, regexp.flags)
  }],
  [Map, {
    setters: ['clear', 'delete', 'set'],
    copy (original, {refs, during, after, ...rest}) {
      const _copy = new Map();
      const copy = during ? during(original, _copy) || _copy : _copy;
      refs.set(original, copy);
      for (const [key, val] of cloneObject([...original], { refs, during, after, ...rest })) copy.set(key, val);
      if (after) {
        const afterReturn = after(original, copy);
        if (afterReturn) {
          refs.set(original, afterReturn);
          return afterReturn
        }
      }
      return copy
    }
  }],
  [Set, {
    setters: ['add', 'clear', 'delete'],
    copy (original, {refs, during, after, ...rest}) {
      const _copy = new Set();
      const copy = during ? during(original, _copy) || _copy : _copy;
      refs.set(original, copy);
      for (const val of cloneObject([...original], { refs, during, after, ...rest })) copy.add(val);
      if (after) {
        const afterReturn = after(original, copy);
        if (afterReturn) {
          refs.set(original, afterReturn);
          return afterReturn
        }
      }
      return copy
    }
  }]
]);
const isIgnoredObjectType = obj => ignoreObjectTypes.some(type => obj instanceof type);
const isBuiltIn = obj => [...builtInObjects].find(([type]) => obj instanceof type);

function cloneObject (original = {}, { refs = new Map(), filter, before, during, after } = {}) {
  const args = { refs, filter, before, during, after };
  if (refs.has(original)) return refs.get(original)
  if (before) {
    const beforeReturn = before(original);
    if (beforeReturn) {
      refs.set(original, beforeReturn);
      return beforeReturn
    }
  }
  if (isIgnoredObjectType(original) || (filter && filter(original))) return original
  const builtInPair = isBuiltIn(original);
  if (builtInPair) return builtInPair[1].copy(original, args)
  const _object = Array.isArray(original) ? [...original] : Object.create(Object.getPrototypeOf(original));
  const object = during ? during(original, _object) || _object : _object;
  refs.set(original, object);
  for (const [prop, desc] of Object.entries(Object.getOwnPropertyDescriptors(original))) {
    let {value, ...rest} = desc;
    Object.defineProperty(object, prop, {
      ...rest,
      ...value !== undefined && {
        value: value && typeof value === 'object'
          ? cloneObject(value, args)
          : value
      }
    });
  }
  if (after) {
    const afterReturn = after(original, object);
    if (afterReturn) {
      refs.set(original, afterReturn);
      return afterReturn
    }
  }
  return object
}

const getPropertyDescriptorPair = (prototype, property) => {
  let descriptor = Object.getOwnPropertyDescriptor(prototype, property);
  while (!descriptor) {
    prototype = Object.getPrototypeOf(prototype);
    if (!prototype) return
    descriptor = Object.getOwnPropertyDescriptor(prototype, property);
  }
  return {prototype, descriptor}
};

const hasProperty = (object, property) => {
  return !!getPropertyDescriptorPair(object, property)
};

const getPropertyDescriptor = (object, property) => {
  const result = getPropertyDescriptorPair(object, property);
  if (result) return result.descriptor
};
const getPropertyDescriptorPrototype = (object, property) => {
  const result = getPropertyDescriptorPair(object, property);
  if (result) return result.prototype
};

var proxify = object => new Proxy(object, {
  get (target, property, receiver) {
    if (reactivityProperties.includes(property)) return Reflect.get(target, property, receiver)
    const propertyReactivity$$1 = propertyReactivity(target, property);
    const descriptor = getPropertyDescriptor(target, property);
    let value;
    if (descriptor && 'value' in descriptor) { // property
      value = Reflect.get(target, property, receiver);
    } else { // getter
      if ('cache' in propertyReactivity$$1) {
        value = propertyReactivity$$1.cache;
      } else {
        const watcher = _ => {
          notify({ target, property });
        };
        watcher.propertyReactivity = propertyReactivity$$1;
        watcher.cache = true;
        value = registerWatcher(_ => (propertyReactivity$$1.cache = Reflect.get(target, property, receiver)), watcher, {object, property});
      }
    }
    registerDependency({ target, property });
    if (value && (typeof value === 'object' || typeof value === 'function') && value[exports.reactivitySymbol]) registerDependency({ target: value });
    return value
  },
  set (target, property, _value, receiver) {
    registerDependency({ target: receiver });
    if (_value === target[property]) return true
    if (reactivityProperties.includes(property)) {
      registerDependency({ target: _value });
      return Reflect.set(target, property, _value, receiver)
    }
    let value = reactify(_value);
    registerDependency({ target: value });
    if (typeof value === 'function' && value.$promise && value.$resolved) value = value.$resolvedValue;
    else if (typeof value === 'function' && value.$promise) {
      value.$promise.then(val =>
        target[property] === value
        ? (receiver[property] = val)
        : undefined);
    }
    try {
      return Reflect.set(target, property, value, receiver)
    } finally {
      notify({ target, property, value });
    }
  },
  deleteProperty (target, property) {
    registerDependency({ target: target });
    if (reactivityProperties.includes(property)) return Reflect.deleteProperty(target, property)
    try {
      return Reflect.deleteProperty(target, property)
    } finally {
      notify({ target, property });
      const reactivityProperties$$1 = target[exports.reactivitySymbol].properties;
      if (!reactivityProperties$$1.get(property).watchers.length) reactivityProperties$$1.delete(property);
    }
  }
  // defineProperty (target, property, {value, ...rest}) {
  //   console.log('defineProperty', property)
  //   if (reactivityProperties.includes(property)) return Reflect.defineProperty(target, property, {...value !== undefined && { value }, ...rest})
  //   try {
  //     return Reflect.defineProperty(target, property, {
  //       ...value !== undefined && { value: r(value) },
  //       ...rest
  //     })
  //   } finally {
  //     notify({ target, property })
  //     notify({ target })
  //   }
  // }
})

const type = Map;

const reactivePrototype = new Map([
  ['set', {
    notify: true
  }],
  ['delete', {
    notify: true
  }],
  ['clear', {
    notify: true
  }]
]);

// Todo: Make a system to improve notify calls by specifying a property

const ReactiveType = class ReactiveMap extends Map {
  constructor (iterator) {
    super();
    const proxy = proxify(this);
    setObjectReactivity({target: proxy, original: iterator, object: this});
    if (iterator) for (const [key, val] of iterator) proxy.set(key, val);
    return proxy
  }
  set (key, val) {
    const value = reactify(val);
    try {
      return super.set.apply(this[exports.reactivitySymbol].object, [key, value])
    } finally {
      registerDependency({ target: this, key });
      notify({ target: this, value });
    }
  }
  delete (key, val) {
    const value = reactify(val);
    try {
      return super.delete.apply(this[exports.reactivitySymbol].object, [key, value])
    } finally {
      registerDependency({ target: this, key });
      notify({ target: this, value });
    }
  }
  get (key) {
    try {
      return super.get.apply(this[exports.reactivitySymbol].object, [key])
    } finally {
      registerDependency({ target: this, key });
    }
  }
  has (key) {
    try {
      return super.has.apply(this[exports.reactivitySymbol].object, [key])
    } finally {
      registerDependency({ target: this, key });
    }
  }
};

var map = map => new ReactiveType(map)

var map$1 = /*#__PURE__*/Object.freeze({
  type: type,
  reactivePrototype: reactivePrototype,
  ReactiveType: ReactiveType,
  default: map
});

const type$1 = Set;

const reactivePrototype$1 = new Map([
  ['add', {
    notify: true
  }],
  ['delete', {
    notify: true
  }],
  ['clear', {
    notify: true
  }]
]);

const ReactiveType$1 = class ReactiveSet extends Set {
  constructor (iterator) {
    super();
    const proxy = proxify(this);
    setObjectReactivity({target: proxy, original: iterator, object: this});
    if (iterator) for (const val of iterator) proxy.add(val);
    return proxy
  }
  add (val) {
    const value = reactify(val);
    try {
      return super.add.apply(this[exports.reactivitySymbol].object, [value])
    } finally {
      registerDependency({ target: this });
      notify({ target: this, value });
    }
  }
};

var set = set => new ReactiveType$1(set)

var set$1 = /*#__PURE__*/Object.freeze({
  type: type$1,
  reactivePrototype: reactivePrototype$1,
  ReactiveType: ReactiveType$1,
  default: set
});

const type$2 = Node;

var node = node => {
  setObjectReactivity({target: node, unreactive: true});
  return node
}

var node$1 = /*#__PURE__*/Object.freeze({
  type: type$2,
  default: node
});

const type$3 = RegExp;

var regexp = regexp => {
  setObjectReactivity({target: regexp, unreactive: true});
  return regexp
}

var regexp$1 = /*#__PURE__*/Object.freeze({
  type: type$3,
  default: regexp
});

const type$4 = Promise;

const promisify = promise => {
  const func = _ => {};
  Object.defineProperty(func, '$promise', {value: promise});
  Object.defineProperty(func, '$resolved', {value: false});
  const proxy = new Proxy(func, {
    get (target, prop, receiver) {
      if (prop in func) return func[prop]
      if (prop in Promise.prototype) return typeof promise[prop] === 'function' ? promise[prop].bind(promise) : promise[prop]
      else {
        return promisify(new Promise(async (resolve, reject) => {
          try {
            resolve((await promise)[prop]);
          } catch (err) { reject(err); }
        }))
      }
    },
    async apply (target, thisArg, argumentsList) { return (await promise).apply(thisArg, argumentsList) }
  });
  setObjectReactivity({target: proxy, object: func, original: promise});
  promise.then(value => {
    if (value && typeof value === 'object') {
      const reactiveValue = reactify(value);
      const { object } = reactiveValue[exports.reactivitySymbol];
      Object.defineProperty(object, '$promise', {value: promise});
      Object.defineProperty(object, '$resolved', {value: true});
      Object.defineProperty(object, '$resolvedValue', {value});
    }
    notify({target: proxy});
  });
  return proxy
};

var promise = /*#__PURE__*/Object.freeze({
  type: type$4,
  default: promisify
});

const type$5 = Array;

var array = array => {
  const arr = [];
  const reactiveArray = proxify(arr);
  setObjectReactivity({target: reactiveArray, original: array, object: arr});
  array.forEach((val, i) => (reactiveArray[i] = reactify(val)));
  return reactiveArray
}

var array$1 = /*#__PURE__*/Object.freeze({
  type: type$5,
  default: array
});

const type$6 = Object;

var object = object => {
  const obj = Object.create(Object.getPrototypeOf(object));
  const reactiveObject = proxify(obj);
  setObjectReactivity({target: reactiveObject, original: object, object: obj});
  Object.entries(Object.getOwnPropertyDescriptors(object)).forEach(([prop, {value, ...rest}]) => Object.defineProperty(reactiveObject, prop, {
    ...value !== undefined && { value: reactify(value) },
    ...rest
  }));
  return reactiveObject
}

var object$1 = /*#__PURE__*/Object.freeze({
  type: type$6,
  default: object
});

const builtIn = [
  map$1,
  set$1,
  node$1,
  promise,
  regexp$1
];

var types = new Map([
  ...builtIn,
  array$1,
  object$1
].map(({type: type$$1, default: reactify$$1}) => ([type$$1, reactify$$1])))

for (const { type: type$$1, ReactiveType: ReactiveType$$1, reactivePrototype: reactivePrototype$$1 } of builtIn) {
  if (!ReactiveType$$1) continue
  const mapDescriptors = Object.getOwnPropertyDescriptors(type$$1.prototype);
  for (const prop of [...Object.getOwnPropertyNames(mapDescriptors), ...Object.getOwnPropertySymbols(mapDescriptors)]) {
    const { notify: _notify } = reactivePrototype$$1.get(prop) || {};
    if (!ReactiveType$$1.prototype.hasOwnProperty(prop)) {
      const desc = mapDescriptors[prop];
      Object.defineProperty(ReactiveType$$1.prototype, prop, {
          ...desc,
          ...'value' in desc && typeof desc.value === 'function' && {
            value: function (...args) {
              return type$$1.prototype[prop].apply(this[exports.reactivitySymbol].object, args)
              // try {
              //   return type.prototype[prop].apply(this[reactivitySymbol].object, args)
              // } finally {
              //   registerDependency({ target: this })
              //   if (_notify) notify({ target: this })
              // }
            }
          }/*,
          ...'get' in desc && desc.get && {
            get () {
              try {
                return Reflect.get(type.prototype, prop, this[reactivitySymbol].object)
              } finally {
                registerDependency({ target: this, property: prop })
              }
            }
          }*/
        });
    }
  }
}

exports.reactiveRootSymbol = Symbol.for('OzReactiveRoot');
exports.reactivitySymbol = Symbol.for('OzReactivity');
exports.reactiveRoot = {
  watchers: [],
  objects: new WeakMap()
};

const setReactiveRootSymbol = symbol => (exports.reactiveRootSymbol = symbol);
const setReactivitySymbol = symbol => (exports.reactivitySymbol = symbol);
const setReactiveRoot = _reactiveRoot => (exports.reactiveRoot = _reactiveRoot);

const reactivityProperties = ['$watch', exports.reactivitySymbol];

const setObjectReactivity = ({target, unreactive, original, object}) => {
  if (unreactive) return (target[exports.reactivitySymbol] = false)
  if (original) exports.reactiveRoot.objects.set(original, target);
  Object.defineProperty(target, exports.reactivitySymbol, { value: { watchers: [], properties: new Map(), object } });
  Object.defineProperty(target, '$watch', { value: _watch(target) });
};

const reactify = obj => {
  if (!obj || typeof obj !== 'object' || exports.reactivitySymbol in obj) return obj
  if (exports.reactiveRoot.objects.has(obj)) return exports.reactiveRoot.objects.get(obj)
  const reactify = Array.from(types).find(([type]) => obj instanceof type);
  return reactify[1](obj)
};

const notify = ({ target, property, value }) => {
  const reactivity = target[exports.reactivitySymbol];
  if (!reactivity) return
  const callWatchers = watchers => {
    const currentWatcher = exports.reactiveRoot.watchers[exports.reactiveRoot.watchers.length - 1];
    if (watchers.includes(currentWatcher)) watchers.splice(watchers.indexOf(currentWatcher), 1);
    const cacheWatchers = watchers.filter(({cache}) => cache);/* .filter(({_target, _property}) => (target === _target && property === _property)) */
    cacheWatchers.forEach(({propertyReactivity}) => delete propertyReactivity.cache);
    cacheWatchers.forEach(watcher => watcher({ target, property, value }));
    watchers.filter(({cache}) => !cache).forEach(watcher => watcher({ target, property, value }));
  };
  if (property) {
    const watchers = propertyReactivity(target, property).watchers;
    propertyReactivity(target, property).watchers = [];
    callWatchers(watchers);
  }/* else {
    const watchers = reactivity.watchers
    reactivity.watchers = []
    callWatchers(watchers)
  }*/
  const watchers = reactivity.watchers;
  reactivity.watchers = [];
  callWatchers(watchers);
};

const registerWatcher = (getter, watcher, {object, property} = {}) => {
  watcher.object = object;
  watcher.property = property;
  exports.reactiveRoot.watchers.push(watcher);
  const value = getter();
  exports.reactiveRoot.watchers.pop();
  return value
};

const propertyReactivity = (target, property) => {
  const properties = target[exports.reactivitySymbol].properties;
  if (properties.has(property)) return properties.get(property)
  const propertyReactivity = {
    watchers: []
    // cache: undefined
  };
  properties.set(property, propertyReactivity);
  return propertyReactivity
};

const includeWatcher = (arr, watcher) => arr.some((_watcher) => watcher === _watcher ||
  (watcher.object && watcher.property && watcher.object === _watcher.object && watcher.property === _watcher.property));

const pushCurrentWatcher = ({watchers}) => {
  const currentWatcher = exports.reactiveRoot.watchers[exports.reactiveRoot.watchers.length - 1];
  if (currentWatcher && !includeWatcher(watchers, currentWatcher)) watchers.push(currentWatcher);
};

const registerDependency = ({ target, property }) => {
  const reactivity = target[exports.reactivitySymbol];
  if (!exports.reactiveRoot.watchers.length || !reactivity) return
  if (property) pushCurrentWatcher(propertyReactivity(target, property));
  else pushCurrentWatcher(reactivity);
};

const pushWatcher = (object, watcher) =>
  object &&
  typeof object === 'object' &&
  object[exports.reactivitySymbol] &&
  !object[exports.reactivitySymbol].watchers.some(_watcher => _watcher === watcher) &&
  object[exports.reactivitySymbol].watchers.push(watcher);

const _watch = target => (getter, handler) => {
  if (target) {
    if (!handler) {
      handler = getter;
      getter = undefined;
    }
    if (typeof getter === 'string') {
      const property = getter;
      getter = _ => target[property];
    }
  }
  let unwatch, oldValue;
  const watcher = _ => {
    if (unwatch) return
    if (getter) {
      let newValue = registerWatcher(getter, watcher);
      pushWatcher(newValue, watcher);
      if (handler) handler(newValue, oldValue);
      oldValue = newValue;
    } else {
      handler(target, target);
      pushWatcher(target, watcher);
    }
  };
  if (getter) oldValue = registerWatcher(getter.bind(target, target), watcher);
  pushWatcher(getter ? oldValue : target, watcher);
  return _ => (unwatch = true)
};

const watch = _watch();

let elementContext = Symbol.for('OzElementContext');

const mixins = [];
const mixin = obj => mixins.push(obj);
let currentContexts = [];

const callMixin = (context, options, mixin) => {
  const parentContext = currentContexts[currentContexts.length - 1];
  mixin({ context, options, ...parentContext && parentContext !== context && { parentContext: parentContext } });
};

const pushContext = (context, func) => {
  const _currentContexts = [...currentContexts];
  currentContexts = [...currentContexts, context];
  try {
    return func()
  } finally {
    currentContexts = [..._currentContexts];
  }
};

const registerElement = options => {
  const {
    name,
    extends: extend,
    shadowDom,
    state,
    props,
    methods,
    watchers = [],
    template: htmlTemplate,
    style: cssTemplate,
    created,
    connected,
    disconnected,
    ...rest
  } = options;
  const extendsClass = extend ? Object.getPrototypeOf(document.createElement(extend)).constructor : HTMLElement;
  class OzElement extends extendsClass {
    constructor () {
      super();
      const host = shadowDom && this.attachShadow ? this.attachShadow({ mode: shadowDom }) : this;
      const context = this[elementContext] = reactify({
        ...rest,
        host,
        props: {},
        methods: {},
        template: undefined,
        style: undefined
      });
      context.state = reactify(typeof state === 'function' ? state(context) : state || {});
      if (methods) {
        for (const method in methods) context.methods[method] = methods[method].bind(undefined, context);
      }
      if (props) {
        const propsDescriptors = {};
        for (const prop of props) {
          propsDescriptors[prop] = {
            enumerable: true,
            get: _ => context.props[prop],
            set: val => (context.props[prop] = val)
          };
        }
        Object.defineProperties(this, propsDescriptors);
      }
      mixins.forEach(callMixin.bind(undefined, context, options));
      if (htmlTemplate) {
        let template, build;
        const buildTemplate = htmlTemplate.bind(undefined, context);
        watch(_ => pushContext(context, _ => (build = buildTemplate())), build => {
          if (template.id === build.id) template.update(...build.values);
          else {
            pushContext(context, _ => {
              template.content; // eslint-disable-line
              template = build();
              context.template = template;
              host.appendChild(template.content);
            });
          }
        });
        if (!build.build) throw new Error('The template function should return a html-template build.')
        pushContext(context, _ => (template = build()));
        context.template = template;
      }
      if (cssTemplate) {
        let template, build;
        const buildTemplate = cssTemplate.bind(undefined, context);
        watch(_ => (build = buildTemplate()), build => template.update(...build.values));
        // if (!build.build) throw new Error('The style function should return a css-template build.')
        template = build();
        context.style = template;
      }
      for (const item of watchers) {
        if (Array.isArray(item)) watch(item[0].bind(undefined, context), item[1].bind(undefined, context));
        else watch(item.bind(undefined, context));
      }
      if (created) created(context);
    }

    static get __ozElement__ () { return true }
    static get name () { return name }
    static get observedAttributes () { return props }

    attributeChangedCallback (attr, oldValue, newValue) {
      if (props.includes(attr)) this[attr] = newValue;
    }

    connectedCallback () {
      const { [elementContext]: context, [elementContext]: { host, style, template } } = this;
      mixins.forEach(callMixin.bind(undefined, context, options));
      if (template) pushContext(context, _ => host.appendChild(template.content));
      if (style) {
        if (shadowDom) host.appendChild(style.content);
        else {
          const root = host.getRootNode();
          if (root === document) host.getRootNode({composed: true}).head.appendChild(style.content);
          else root.appendChild(style.content);
        }
        style.update();
      }
      if (connected) connected(context);
    }

    disconnectedCallback () {
      const { [elementContext]: context, [elementContext]: { style } } = this;
      if (style && !shadowDom) style.content.parentElement.removeChild(style.content); // todo: check why the element is emptied but not removed
      if (disconnected) disconnected(context);
    }
  }
  customElements.define(name, OzElement, { ...extend ? { extends: extend } : undefined });
  return OzElement
};

const html = (_ => {
  const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
  const regex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`);
  const globalRegex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`, 'g');
  const placeholder = id => `oz-template-placeholder-${id}-${random}`;
  const split = str => str.split(globalRegex);
  const getSplitValueIndexes = split => split.filter((str, i) => i % 2);
  const mergeSplitWithValues = (split, values) => split.map((str, i) => i % 2 ? values[str] : str).join('');
  const mergeSplitWithPlaceholders = strings => strings[0] + [...strings].splice(1).map((str, i) => placeholder(i) + str).join('');
  const indexPlaceholders = placeholders => placeholders.reduce((arr, placeholder) => [...arr, ...(placeholder.indexes || [placeholder.index]).map(id => placeholder)], []);
  const differenceIndexes = (arr1, arr2) => arr1.length >= arr2.length ? arr1.reduce((arr, val, i) => [...arr, ...val === arr2[i] ? [] : [i]], []) : differenceIndexes(arr2, arr1);
  return {
    random,
    regex,
    globalRegex,
    placeholder,
    split,
    getSplitValueIndexes,
    mergeSplitWithValues,
    mergeSplitWithPlaceholders,
    indexPlaceholders,
    differenceIndexes
  }
})();

const css = (_ => {
  const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
  const regex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`);
  const globalRegex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`, 'g');
  const placeholder = id => `oz-template-placeholder-${id}-${random}`;
  const split = str => str.split(globalRegex);
  const getSplitValueIndexes = split => split.filter((str, i) => i % 2);
  const mergeSplitWithValues = (split, values) => split.map((str, i) => i % 2 ? values[str] : str).join('');
  const mergeSplitWithPlaceholders = strings => strings[0] + [...strings].splice(1).map((str, i) => placeholder(i) + str).join('');
  const indexPlaceholders = placeholders => placeholders.reduce((arr, placeholder) => [...arr, ...(placeholder.indexes || [placeholder.index]).map(id => placeholder)], []);
  const differenceIndexes = (arr1, arr2) => arr1.length >= arr2.length ? arr1.reduce((arr, val, i) => [...arr, ...val === arr2[i] ? [] : [i]], []) : differenceIndexes(arr2, arr1);
  return {
    random,
    regex,
    globalRegex,
    placeholder,
    split,
    getSplitValueIndexes,
    mergeSplitWithValues,
    mergeSplitWithPlaceholders,
    indexPlaceholders,
    differenceIndexes
  }
})();

const { placeholder: placeholderStr, split, getSplitValueIndexes: getSplitIds, mergeSplitWithValues: execSplit } = css;

async function setPlaceholdersPaths (sheet, placeholders, values) {
  const rules = sheet.cssRules;
  const arrRules = [...rules];
  for (const rulesI in arrRules) {
    const rule = arrRules[rulesI];
    if (!rule.cssText.includes('var(--oz-template-placeholder-')) continue
    for (const style of rule.style) {
      const val = rule.style[style];
      if (val.includes('var(--oz-template-placeholder-')) {
        const valSplit = split(val);
        placeholders.push({
          type: 'value',
          ids: getSplitIds(valSplit),
          path: ['cssRules', rulesI, 'style', style],
          split: valSplit
        });
      }
    }
  }
}

const getStyle = (path, sheet) => path.reduce((item, i) => item[i], sheet);

const cssTemplate = (parser, options) => {
  const cache = new Map();
  return (_strings, ...values) => {
    const strings = [..._strings];
    const id = strings.join(placeholderStr(''));
    const cached = cache.get(id);
    if (cached) return cached(...values)
    const { css: css$$1 } = parser(strings, values);
    const placeholders = [];
    // For non-in-shadow elements
    // const style = document.createElement('link')
    // const blob = new Blob([css], { type: 'text/css' })
    // const url = window.URL.createObjectURL(blob)
    // style.type = 'text/css'
    // style.rel = 'stylesheet'
    // style.href = url

    // For in-shadow elements
    // const blob = new Blob([css], { type: 'text/css' })
    // const url = window.URL.createObjectURL(blob)
    // style.type = 'text/css'
    // style.innerHTML = `@import url('${url}')`

    const style = document.createElement('style');
    style.innerHTML = css$$1;
    document.body.appendChild(style);
    setPlaceholdersPaths(style.sheet, placeholders, values); // setPlaceholdersPaths is async to make firefox gucci since they deal asynchronously with css parsing
    document.body.removeChild(style);
    const createCachedInstance = (...values) => {
      const createInstance = _ => {
        const node = style.cloneNode(true);
        const instance = {
          values: [],
          update (...values) {
            if (values.length) instance.values = values;
            else values = instance.values;
            const { sheet } = node;
            if (!sheet) return
            for (const placeholder of placeholders) {
              const path = [...placeholder.path];
              const name = path.splice(-1, 1);
              let styleDeclaration = getStyle(path, sheet);
              switch (placeholder.type) {
                case 'value':
                  setTimeout(_ => (styleDeclaration[name] = execSplit(placeholder.split, values).slice(6, -1)), 0);
                  break
              }
            }
          },
          content: node
        };
        instance.update(...values);
        return instance
      };
      createInstance.id = id;
      createInstance.values = values;
      return createInstance
    };
    cache.set(id, createCachedInstance);
    return createCachedInstance(...values)
  }
};

const { placeholder } = css;

const css$1 = cssTemplate((source, values) => {
  let src = source[0];
  for (const i in values) {
    if (i === 0) continue
    src += `var(--${placeholder(i)})${source[parseInt(i) + 1]}`;
  }
  return {css: src}
});
// todo: add features with a css parser, https://github.com/reworkcss/css/blob/master/lib/parse/index.js

registerElement({
  name: 'router-link',
  extends: 'a',
  style: _ => css$1`router-link, a[is="router-link"] { cursor: pointer; }`
})

const {
  placeholder: placeholder$1,
  split: split$1,
  getSplitValueIndexes,
  mergeSplitWithValues,
  mergeSplitWithPlaceholders
} = html;

const attribute = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const ncname = '[a-zA-Z_][\\w\\-\\.]*';
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/(${qnameCapture}[^>]*)>`);

const parseAttributes = ({leftHTML = '', rightHTML, attributes = []}) => {
  const tagCloseMatch = rightHTML.match(startTagClose);
  if (tagCloseMatch) return { attributes: attributes, leftHTML: leftHTML, rightHTML }
  const match = rightHTML.match(attribute);
  if (!match) throw new SyntaxError(`Oz html template attribute parsing: tag isn't closed.`)
  const attrNameSplit = split$1(match[1]);
  const attributeValue = match[3] || match[4] || match[5];
  const attrValueSplit = attributeValue ? split$1(attributeValue) : [''];
  const indexes = [...getSplitValueIndexes(attrNameSplit), ...getSplitValueIndexes(attrValueSplit)];
  return parseAttributes({
    leftHTML: `${leftHTML} ${indexes.length ? placeholder$1(indexes[0]) : match[0]}`,
    rightHTML: rightHTML.substring(match[0].length),
    attributes: indexes.length ? [...attributes, {
      type: match[3] ? '"' : match[4] ? '\'' : '',
      nameSplit: attrNameSplit,
      valueSplit: attrValueSplit,
      indexes
    }] : attributes
  })
};

const parsePlaceholders$1 = ({ htmlArray, values, placeholders = [], leftHTML = '', rightHTML }) => {
  if (rightHTML === undefined) return parsePlaceholders$1({ values, rightHTML: mergeSplitWithPlaceholders(htmlArray) })
  if (!rightHTML.length) return { placeholders, html: leftHTML }
  const _textEnd = rightHTML.indexOf('<');
  const isComment = rightHTML.startsWith('<!--');
  if (_textEnd || isComment) {
    const textEnd = _textEnd === -1 ? rightHTML.length : _textEnd;
    const commentEnd = isComment ? rightHTML.indexOf('-->') : undefined;
    if (isComment && commentEnd === -1) throw new Error(`Comment not closed, can't continue the template parsing "${rightHTML.substring(0, textEnd)}"`)
    const textContent = rightHTML.substring(isComment ? 4 : 0, isComment ? commentEnd : textEnd);
    const textSplit = split$1(textContent);
    const hasPlaceholder = textSplit.length > 1;
    const indexes = getSplitValueIndexes(textSplit);
    return parsePlaceholders$1({
      values,
      placeholders: hasPlaceholder ? [...placeholders, {
        type: isComment ? 'comment' : 'text',
        indexes: getSplitValueIndexes(textSplit),
        split: textSplit
      }] : placeholders,
      leftHTML: leftHTML + (isComment ? `<!--${hasPlaceholder ? placeholder$1(indexes[0]) : textContent}-->` : textContent),
      rightHTML: rightHTML.substring(isComment ? commentEnd + 3 : textEnd)
    })
  }
  const startTagMatch = rightHTML.match(startTagOpen);
  if (startTagMatch) {
    const tagSplit = split$1(startTagMatch[1]);
    const hasPlaceholder = tagSplit.length > 1;
    const indexes = getSplitValueIndexes(tagSplit);
    const {
      attributes,
      leftHTML: _leftHTML,
      rightHTML: _rightHTML
    } = parseAttributes({rightHTML: rightHTML.substring(startTagMatch[0].length)});
    const attributePlaceholders = attributes.map(({type, ...rest}) => ({
      type: 'attribute',
      attributeType: type,
      tag: indexes,
      attributes: attributes.map(({indexes}) => indexes).filter(indexes => rest.indexes !== indexes),
      ...rest
    }));
    return parsePlaceholders$1({
      values,
      placeholders: [...placeholders, ...hasPlaceholder ? [{
        type: 'tag',
        indexes,
        split: tagSplit,
        attributes: attributes.map(({indexes}) => indexes)
      }] : [],
        ...attributePlaceholders.length ? attributePlaceholders : []],
      leftHTML: `${leftHTML}<${mergeSplitWithValues(tagSplit, values)}${hasPlaceholder ? ` ${placeholder$1(indexes[0])} ` : ''}${_leftHTML}`,
      rightHTML: _rightHTML
    })
  }
  const endTagMatch = rightHTML.match(endTag);
  if (endTagMatch) {
    const tagSplit = split$1(endTagMatch[1]);
    return parsePlaceholders$1({
      values,
      placeholders,
      leftHTML: `${leftHTML}</${mergeSplitWithValues(tagSplit, values)}>`,
      rightHTML: rightHTML.substring(endTagMatch[0].length)
    })
  }
};

const { placeholder: placeholderStr$1, indexPlaceholders, regex: placeholderRegex, mergeSplitWithValues: mergeSplitWithValues$1, mergeSplitWithPlaceholders: mergeSplitWithPlaceholders$1, split: split$2 } = html;

const getSiblingIndex = ({previousSibling} = {}, i = 0) => previousSibling ? getSiblingIndex(previousSibling, i + 1) : i;

const getNodePath = ({node, node: {parentElement: parent} = {}, path = []}) => parent
  ? getNodePath({node: parent, path: [...path, [...parent.childNodes].indexOf(node)]})
  : [...path, getSiblingIndex(node)].reverse();

const getNode = (node, path) => path.reduce((currNode, i) => currNode.childNodes.item(i), node);

const getValueIndexDifferences = (arr, arr2) => arr2.length > arr.length
  ? getValueIndexDifferences(arr2, arr)
  : arr.reduce((arr, item, i) =>
    [
      ...arr,
      ...item !== arr2[i] ? [i] : []
    ], []);

const flattenArray$1 = arr => arr.reduce((arr, item) => Array.isArray(item) ? [...arr, ...flattenArray$1(item)] : [...arr, item], []);

const getPlaceholderWithPaths$1 = (node, _placeholders) => {
  const placeholders = _placeholders.reduce((arr, placeholder) => [...arr, ...placeholder.type === 'text'
    ? [...placeholder.indexes.map(index => ({type: 'text', index}))]
    : [placeholder]]
  , []);
  const placeholderByIndex = indexPlaceholders(placeholders);
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT + NodeFilter.SHOW_TEXT, undefined, false);
  const nodes = new Map();
  const paths = new Map();
  const nodesToRemove = [];
  while (walker.nextNode()) {
    const currentNode = walker.currentNode;
    const match = currentNode.nodeValue.match(placeholderRegex);
    if (match) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const placeholderNode = currentNode.splitText(match.index);
        placeholderNode.nodeValue = placeholderNode.nodeValue.substring(match[0].length);
        if (placeholderNode.nodeValue.length) placeholderNode.splitText(0);
        if (!currentNode.nodeValue.length) nodesToRemove.push(currentNode); // currentNode.parentNode.removeChild(currentNode)
        nodes.set(placeholderByIndex[match[1]], placeholderNode);
      } else if (currentNode.nodeType === Node.COMMENT_NODE) {
        nodes.set(placeholderByIndex[match[1]], currentNode);
      }
    }
  }
  for (const node of nodesToRemove) node.parentNode.removeChild(node);
  for (const placeholder of placeholders) {
    const type = placeholder.type;
    paths.set(placeholder, getNodePath({node: nodes.get(placeholder)}));
    if (type === 'attribute' || type === 'tag') {
      const attributeName = placeholderStr$1(placeholder.indexes[0]);
      const foundNode = node.querySelector(`[${attributeName}]`);
      foundNode.removeAttribute(attributeName);
      paths.set(placeholder, getNodePath({node: foundNode}));
    }
  }
  return [...paths].map(([placeholder, path]) => ({...placeholder, path}))
};

const createInstance$1 = ({ id, template, placeholders }, ...values) => {
  const doc = document.importNode(template.content, true);
  let bypassDif = true;
  let childNodes = [...doc.childNodes];
  let listeners = [];
  let placeholdersNodes = new Map(placeholders.map(placeholder => (
    [
      placeholder,
      placeholder.type === 'text' ? [getNode(doc, placeholder.path)] : getNode(doc, placeholder.path)
    ]
  )));
  let placeholdersData = new Map(placeholders.map(placeholder => [placeholder, {}]));
  let placeholderByIndex = indexPlaceholders(placeholders);

  const updatePlaceholder = ({ values, placeholder }) => {
    const currentData = placeholdersData.get(placeholder);
    if (currentData && currentData.directive) currentData.directive(); // cleanup directive function
    const index = placeholder.index || placeholder.indexes[0];
    const directive = values[index];
    const data = placeholdersData.get(placeholder);
    const node = placeholdersNodes.get(placeholder);

    const replaceNode = (newNode, node) => {
      placeholdersNodes = new Map([...placeholdersNodes, [placeholder, newNode]]
        .map(([_placeholder, _node]) => node === _node
        ? [_placeholder, newNode]
        : [_placeholder, _node])
      );
      childNodes = Object.assign([...childNodes], {[childNodes.indexOf(node)]: newNode});
      const { parentNode } = node;
      if (parentNode) {
        parentNode.insertBefore(newNode, node);
        parentNode.removeChild(node);
      }
    };

    const replaceNodes = (newArray, oldArray) => {
      placeholdersNodes = new Map([...placeholdersNodes, [placeholder, newArray]]);
      childNodes = Object.assign([...childNodes], {[childNodes.indexOf(oldArray)]: newArray});
      newArray = flattenArray$1(newArray);
      oldArray = flattenArray$1(oldArray);
      const nodesToRemove = oldArray.filter(node => !newArray.includes(node));
      for (const i in newArray) {
        const newNode = newArray[i];
        const oldNode = oldArray[i];
        if (newNode !== oldNode) {
          if (oldNode && oldNode.parentNode) {
            oldNode.parentNode.insertBefore(newNode, oldNode);
            oldNode.parentNode.removeChild(oldNode);
          } else {
            const previousNewNode = newArray[i - 1];
            if (previousNewNode && previousNewNode.parentNode) {
              previousNewNode.parentNode.insertBefore(newNode, previousNewNode.nextSibling);
              if (oldNode && oldNode.parentNode) oldNode.parentNode.removeChild(oldNode);
            }
          }
        }
      }
      for (const node of nodesToRemove) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
      }
    };

    const setElement = newElement => {
      const element = placeholdersNodes.get(placeholder);
      const elementPlaceholders = placeholder.attributes.map(indexes => placeholderByIndex[indexes[0]]);
      for (const {name, value} of element.attributes) newElement.setAttribute(name, value);
      for (const childNode of element.childNodes) newElement.appendChild(childNode);
      replaceNode(newElement, element);
      for (const placeholder of elementPlaceholders) updatePlaceholder({values, placeholder});
    };
    if (placeholder.type === 'attribute' && placeholder.indexes.length === 1 && directive && directive.directive) { // placeholder value is a directive
      placeholdersData = new Map([...placeholdersData, [
        placeholder,
        { directive: directive({ getElement: placeholdersNodes.get.bind(placeholdersNodes, placeholder), setElement }) }
      ]]);
    } else {
      const updateResult = update[placeholder.type]({
        placeholder,
        values,
        data,
        [placeholder.type === 'text' ? 'nodes' : 'node']: node,
        placeholderByIndex,
        getChildNodes () { return instance._childNodes },
        setChildNodes: newChildNodes => {
          const _childNodes = childNodes;
          childNodes = newChildNodes;
          for (const listener of listeners) listener(childNodes, _childNodes);
        }
      });
      if (placeholder.type === 'text') {
        if (node !== updateResult.nodes) replaceNodes(updateResult.nodes, node);
      } else if (placeholder.type === 'tag' || placeholder.type === 'attribute') {
        if (node !== updateResult.node) setElement(updateResult.node);
      } else {
        if (node !== updateResult.node) replaceNode(updateResult.node, node);
      }
      placeholdersData = new Map([...placeholdersData, [placeholder, updateResult.data]]);
    }
    for (const listener of listeners) listener(childNodes, node);
  };

  const instance = {
    id,
    values,
    instance: true,
    __reactivity__: false,
    get _childNodes () { return childNodes },
    get childNodes () { return flattenArray$1(childNodes) },
    get content () {
      for (const node of instance.childNodes) doc.appendChild(node);
      return doc
    },
    update (...values) {
      const placeholdersToUpdate =
      bypassDif // if bypass, update all the placeholders (first placeholder setup)
      ? placeholders // all placeholders
      : getValueIndexDifferences(values, instance.values) // placeholders which split values has changed
        .map(index => placeholderByIndex[index]) // placeholders
        .filter(placeholder => placeholder && placeholdersNodes.get(placeholder));
      instance.values = values;
      for (const placeholder of placeholdersToUpdate) updatePlaceholder({placeholder, values});
    },
    listen (func) {
      listeners = [...listeners, func];
      return _ => (listeners = Object.assign([...listeners], {[listeners.indexOf(func)]: undefined}).filter(item => item))
    }
  };
  const textPlaceholdersByFirstNode = new Map(placeholders.filter(({type}) => type === 'text').map(placeholder => [placeholdersNodes.get(placeholder)[0], placeholder]));
  childNodes = childNodes.reduce((arr, node) =>
    textPlaceholdersByFirstNode.has(node)
    ? [...arr, placeholdersNodes.get(textPlaceholdersByFirstNode.get(node))]
    : [...arr, node]
  , []);
  instance.update(...values);
  bypassDif = false;
  return instance
};

const createBuild = ({id, html: html$$1, placeholders: _placeholders}) => {
  const template = document.createElement('template');
  template.innerHTML = html$$1;
  if (!template.content.childNodes.length) template.content.appendChild(new Comment());
  const placeholders = getPlaceholderWithPaths$1(template.content, _placeholders);
  return values => {
    const _createInstance = createInstance$1.bind(undefined, { id, template, placeholders }, ...values);
    _createInstance.build = true;
    _createInstance.id = id;
    _createInstance.values = values;
    return _createInstance
  }
};

const cache = new Map();

const htmlTemplate = transform => (strings, ...values) => {
  if (typeof strings === 'string') strings = [strings];
  const id = 'html' + strings.join(placeholderStr$1(''));
  if (cache.has(id)) return cache.get(id)(values)
  const { html: html$$1, placeholders } = parsePlaceholders$1({htmlArray: split$2(transform(mergeSplitWithPlaceholders$1(strings))).filter((str, i) => !(i % 2)), values});
  const placeholdersWithFixedTextPlaceholders = placeholders.reduce((arr, placeholder) => [...arr,
    ...placeholder.type === 'text'
    ? placeholder.indexes.map(index => ({ type: 'text', indexes: [index], split: ['', index, ''] }))
    : [placeholder]
  ], []);
  const build = createBuild({ id, html: html$$1, placeholders: placeholdersWithFixedTextPlaceholders });
  cache.set(id, build);
  return build(values)
};

const html$1 = htmlTemplate(str => str);

const update = {
  comment ({ values, node, placeholder: { split } }) {
    node.nodeValue = mergeSplitWithValues$1(split, values);
    return { node }
  },
  text ({
    value,
    values,
    getChildNodes,
    setChildNodes,
    nodes = [],
    data: { instance: oldInstance, unlisten: oldUnlisten, textArray: oldTextArray = [] } = {},
    placeholder: { index } = {}
  }) {
    if (oldUnlisten) oldUnlisten();
    if (values && !value) value = values[index];
    if (typeof value === 'string' || typeof value === 'number') {
      if (nodes[0] instanceof Text) {
        if (nodes[0].nodeValue !== value) nodes[0].nodeValue = value;
        return { nodes: [nodes[0]] }
      } else {
        return { nodes: [new Text(value)] }
      }
    } else if (value instanceof Node) {
      if (nodes[0] !== value) return { nodes: [value] }
    } else if (value && value.build) {
      if (oldInstance && oldInstance.instance && oldInstance.id === value.id) {
        oldInstance.update(...value.values);
        return { nodes: oldInstance._childNodes, data: { instance: oldInstance } }
      } else {
        const instance = value();
        const unlisten = instance.listen((newChildNodes, oldChildNodes) => {
          setChildNodes(newChildNodes);
          // const currentChildNodes = getChildNodes()
          // setChildNodes(Object.assign([...currentChildNodes], {[currentChildNodes.indexOf(oldChildNodes)]: newChildNodes}))
        });
        return { nodes: instance._childNodes, data: { instance, unlisten } }
      }
    } else if (value && value.instance) {
      const unlisten = value.listen((newChildNodes, oldChildNodes) => {
        setChildNodes(newChildNodes);
      });
      return { nodes: value._childNodes, data: { instance: value, unlisten } }
    } else if (Array.isArray(value)) {
      if (value.length === 0) value = [undefined];
      // todo: add more of the parameters to cover all of the simple text features
      const textArray = value.map((value, i) => {
        const oldText = oldTextArray[i];
        const text = update.text({
          value,
          nodes: oldText && oldText.nodes,
          data: oldText && oldText.data
        });
        return text
      });
      return { nodes: textArray.map(({nodes}) => nodes), data: { textArray } }
    } else {
      return { nodes: [ nodes[0] instanceof Comment ? nodes[0] : new Comment('') ] }
    }
  },
  tag: ({ values, node, placeholder: { split } }) => {
    const newTag = mergeSplitWithValues$1(split, values);
    return {
      node: node.tagName.toLowerCase() === newTag.toLowerCase()
        ? node
        : document.createElement(newTag)
    }
  },
  attribute ({ values, placeholder, node, data: { name: oldName, listener: oldListener, value: oldValue } = {}, placeholder: { attributeType, nameSplit, valueSplit } }) {
    if (oldListener) node.removeEventListener(oldName, oldValue);
    const name = mergeSplitWithValues$1(nameSplit, values);
    const value = attributeType === '' ? values[valueSplit[1]] : mergeSplitWithValues$1(valueSplit, values); // mergeSplitWithValues(valueSplit, values)
    if (attributeType === '"') { // double-quote
      node.setAttribute(name, value);
    } else if (attributeType === '\'') {  // single-quote
      node.setAttribute(name, value);
    } else if (attributeType === '') {  // no-quote
      let isEvent = name.startsWith('on-') ? 1 : name.startsWith('@') ? 2 : 0;
      if (isEvent) { // Event handling
        const listenerName = name.substring(isEvent === 1 ? 3 : 1);
        node.addEventListener(listenerName, value);
        return { node, data: { name: listenerName, listener: true, value } }
      } else {
        node[name] = value;
      }
    }
    return {node, data: { name }}
  }
};

const getRouterViewPosition = ({parentElement}, n = 0) => parentElement
  ? getRouterViewPosition(parentElement, n + parentElement instanceof RouterView ? 1 : 0)
  : n;

const template = ({state: {components}}) => html$1`${components}`;

const RouterView = customElements.get('router-view') || registerElement({
  name: 'router-view',
  props: ['name'],
  template,
  state: ctx => ({
    get components () {
      const { router: { currentRoutesComponents, currentRoute: { matched } = {} } = {}, props: { name = 'default' } } = ctx;
      if (matched) {
        const routeConfig = matched[getRouterViewPosition(ctx.host)];
        return currentRoutesComponents.has(routeConfig) && currentRoutesComponents.get(routeConfig)/* components */.get(name)/* component */
      }
    }
  })
});

/*
The MIT License (MIT)

Copyright (c) 2014 Blake Embrey (hello@blakeembrey.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/**
 * Default configs.
 */
var DEFAULT_DELIMITER = '/';
var DEFAULT_DELIMITERS = './';

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?"]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined]
  '(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?'
].join('|'), 'g');

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string}  str
 * @param  {Object=} options
 * @return {!Array}
 */
function parse (str, options) {
  var tokens = [];
  var key = 0;
  var index = 0;
  var path = '';
  var defaultDelimiter = (options && options.delimiter) || DEFAULT_DELIMITER;
  var delimiters = (options && options.delimiters) || DEFAULT_DELIMITERS;
  var pathEscaped = false;
  var res;

  while ((res = PATH_REGEXP.exec(str)) !== null) {
    var m = res[0];
    var escaped = res[1];
    var offset = res.index;
    path += str.slice(index, offset);
    index = offset + m.length;

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      pathEscaped = true;
      continue
    }

    var prev = '';
    var next = str[index];
    var name = res[2];
    var capture = res[3];
    var group = res[4];
    var modifier = res[5];

    if (!pathEscaped && path.length) {
      var k = path.length - 1;

      if (delimiters.indexOf(path[k]) > -1) {
        prev = path[k];
        path = path.slice(0, k);
      }
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = '';
      pathEscaped = false;
    }

    var partial = prev !== '' && next !== undefined && next !== prev;
    var repeat = modifier === '+' || modifier === '*';
    var optional = modifier === '?' || modifier === '*';
    var delimiter = prev || defaultDelimiter;
    var pattern = capture || group;

    tokens.push({
      name: name || key++,
      prefix: prev,
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      partial: partial,
      pattern: pattern ? escapeGroup(pattern) : '[^' + escapeString(delimiter) + ']+?'
    });
  }

  // Push any remaining characters.
  if (path || index < str.length) {
    tokens.push(path + str.substr(index));
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {string}             str
 * @param  {Object=}            options
 * @return {!function(Object=, Object=)}
 */
function compile (str, options) {
  return tokensToFunction(parse(str, options))
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length);

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^(?:' + tokens[i].pattern + ')$');
    }
  }

  return function (data, options) {
    var path = '';
    var encode = (options && options.encode) || encodeURIComponent;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      if (typeof token === 'string') {
        path += token;
        continue
      }

      var value = data ? data[token.name] : undefined;
      var segment;

      if (Array.isArray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but got array')
        }

        if (value.length === 0) {
          if (token.optional) continue

          throw new TypeError('Expected "' + token.name + '" to not be empty')
        }

        for (var j = 0; j < value.length; j++) {
          segment = encode(value[j]);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '"')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment;
        }

        continue
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        segment = encode(String(value));

        if (!matches[i].test(segment)) {
          throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but got "' + segment + '"')
        }

        path += token.prefix + segment;
        continue
      }

      if (token.optional) {
        // Prepend partial segment prefixes.
        if (token.partial) path += token.prefix;

        continue
      }

      throw new TypeError('Expected "' + token.name + '" to be ' + (token.repeat ? 'an array' : 'a string'))
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {string} group
 * @return {string}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$/()])/g, '\\$1')
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {string}
 */
function flags (options) {
  return options && options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {!RegExp} path
 * @param  {Array=}  keys
 * @return {!RegExp}
 */
function regexpToRegexp (path, keys) {
  if (!keys) return path

  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        pattern: null
      });
    }
  }

  return path
}

/**
 * Transform an array into a regexp.
 *
 * @param  {!Array}  path
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = [];

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source);
  }

  return new RegExp('(?:' + parts.join('|') + ')', flags(options))
}

/**
 * Create a path regexp from string input.
 *
 * @param  {string}  path
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
function stringToRegexp (path, keys, options) {
  return tokensToRegExp(parse(path, options), keys, options)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}  tokens
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
function tokensToRegExp (tokens, keys, options) {
  options = options || {};

  var strict = options.strict;
  var end = options.end !== false;
  var delimiter = escapeString(options.delimiter || DEFAULT_DELIMITER);
  var delimiters = options.delimiters || DEFAULT_DELIMITERS;
  var endsWith = [].concat(options.endsWith || []).map(escapeString).concat('$').join('|');
  var route = '';
  var isEndDelimited = false;

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];

    if (typeof token === 'string') {
      route += escapeString(token);
      isEndDelimited = i === tokens.length - 1 && delimiters.indexOf(token[token.length - 1]) > -1;
    } else {
      var prefix = escapeString(token.prefix);
      var capture = token.repeat
        ? '(?:' + token.pattern + ')(?:' + prefix + '(?:' + token.pattern + '))*'
        : token.pattern;

      if (keys) keys.push(token);

      if (token.optional) {
        if (token.partial) {
          route += prefix + '(' + capture + ')?';
        } else {
          route += '(?:' + prefix + '(' + capture + '))?';
        }
      } else {
        route += prefix + '(' + capture + ')';
      }
    }
  }

  if (end) {
    if (!strict) route += '(?:' + delimiter + ')?';

    route += endsWith === '$' ? '$' : '(?=' + endsWith + ')';
  } else {
    if (!strict) route += '(?:' + delimiter + '(?=' + endsWith + '))?';
    if (!isEndDelimited) route += '(?=' + delimiter + '|' + endsWith + ')';
  }

  return new RegExp('^' + route, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {Array=}                keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */
function pathToRegexp (path, keys, options) {
  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys)
  }

  if (Array.isArray(path)) {
    return arrayToRegexp(/** @type {!Array} */ (path), keys, options)
  }

  return stringToRegexp(/** @type {string} */ (path), keys, options)
}

mixin(({context, parentContext, options}) => {
  if (options && options.router) {
    context.router = options.router;
    context.router.__rootElementContext__ = context;
  } else if (parentContext && parentContext.router) context.router = parentContext.router;
});

const flattenRoutes = (routes, __path = '', parent) => {
  let map = new Map();
  for (const route of routes) {
    const { path, children } = route;
    const childPath = __path + path;
    const keys = [];
    const _route = {...cloneObject(route), ...parent && {parent}, keys, regex: pathToRegexp(childPath, keys), toPath: compile(childPath)};
    map.set(childPath, _route);
    if (children) {
      for (const [_path, child] of flattenRoutes(children, childPath, _route)) {
        map.set(_path, child);
      }
    }
  }
  return map
};

const getRouteComponents = route => [...route.component ? [['default', route.component]] : [], ...route.components ? Object.entries(route.components) : []];

const createRouteComponents = route => new Map([...getRouteComponents(route)].map(([name, Component]) => ([name, document.createElement(Component.name)])));

const flattenRoute = (route, arr = [route]) => route.parent ? flattenRoute(route.parent, [route.parent, ...arr]) : arr;

const Router = options => {
  performance.mark('OzRouter initialization');
  const base = '/' + (options.base || '').replace(/^\//g, '');
  const originBase = window.location.origin + base;
  const flattenedRoutes = options.routes ? flattenRoutes(options.routes) : undefined;
  const state = reactify({
    fullPath: location.href,
    routes: flattenedRoutes || new Map(),
    routesComponentsConstructors: new Map([...flattenedRoutes].map(([route]) => [route, getRouteComponents(route)])),
    base,
    currentRoute: undefined,
    currentRoutesComponents: new Map(),
    __rootElementContext__: undefined
  });

  let beforeEachGuards = [];
  let beforeResolveGuards = [];
  let afterEachHooks = [];

  const matchPath = path => [...state.routes].find(([, route]) => route.regex.exec(path));
  const matchName = name => [...state.routes].find(([, route]) => route.name === name);

  const resolve = (to, { append, relative } = {}) => {
    const { origin, pathname } = window.location;
    const _base = append || relative ? origin + pathname : originBase;
    const isString = typeof to === 'string';
    const { name, path, params, query = [] } = to || {};
    const [, route] = isString
      ? matchPath(to)
      : name
        ? matchName(name)
        : matchPath(path);
    return {
      route,
      url: isString
        ? new URL(to, _base)
        : new URL(`${path || route.toPath(params)}${query.map(([key, val], i) => `${!i ? '?' : ''}${key}=${val}`).join('&')}`, _base)
    }
  };

  const goTo = async (replace, to) => {
    const { url, route } = resolve(to);
    const matched = flattenRoute(route);
    const { currentRoutesComponents, currentRoute } = state;

    const newRoute = {
      url,
      path: url.pathname,
      params: (route.regex.exec(url.pathname).filter((item, i) => i) || []).reduce((params, val, i) => ({...params, [route.keys[i].name]: val}), {}),
      query: [...url.searchParams],
      hash: url.hash,
      fullPath: url.href,
      matched
    };
    const activatedRoutes = currentRoute ? matched.filter(route => !currentRoute.matched.includes(route)) : matched;
    const reusedRoutes = currentRoute ? matched.filter(route => currentRoute.matched.includes(route)) : [];
    const deactivatedRoutes = currentRoute ? currentRoute.matched.filter(route => !matched.includes(route)) : [];

    const reusedComponents = new Map(reusedRoutes.map(route => [route, currentRoutesComponents.get(route)]));
    const deactivatedComponents = new Map(deactivatedRoutes.map(route => [route, currentRoutesComponents.get(route)]));

    const abortResults = (results, guardFunctionName, reverse) => {
      const abort = results.find(result => reverse ? !result : result);
      if (abort) throw new Error(`OzRouter: naviguation aborted, ${guardFunctionName} returned:\n${JSON.stringify(abort)}`)
    };

    const callComponentsGuards = async (components, guardFunctionName) => {
      abortResults(await Promise.all(components.map(component => {
        const { [elementContext]: context } = component;
        if (!component[guardFunctionName]) return
        return component[guardFunctionName](context || newRoute, context ? newRoute : currentRoute, context ? currentRoute : undefined)
      }).filter(elem => elem)), guardFunctionName);
    };
    await callComponentsGuards(flattenArray([...deactivatedComponents.values()]), 'beforeRouteLeave');

    const beforeEachAbort = (await Promise.all(beforeEachGuards.map(guard => guard(newRoute, currentRoute)))).find(result => result);
    if (beforeEachAbort) throw new Error(`OzRouter: naviguation aborted, beforeEach returned:\n${JSON.stringify(beforeEachAbort)}`)

    await callComponentsGuards(flattenArray([...reusedComponents.values()]), 'beforeRouteUpdate');

    if (route.beforeEnter) {
      const abort = await route.beforeEnter(newRoute, currentRoute);
      if (abort) throw new Error(`OzRouter: naviguation aborted, beforeEnter returned:\n${JSON.stringify(abort)}`)
    }

    // todo: async route components ?

    abortResults(await Promise.all(flattenArray(activatedRoutes.map(route =>
      [...getRouteComponents(route)]
      .filter(Component => Object.getPrototypeOf(Component).beforeRouteEnter)
      .map(Component => Object.getPrototypeOf(Component).beforeRouteEnter.apply(undefined, [newRoute, currentRoute]))
    ))), 'beforeRouteEnter', true);

    const activatedComponents = pushContext(state.__rootElementContext__, _ => new Map(activatedRoutes.map(route => [route, createRouteComponents(route)])));

    state.currentRoutesComponents = new Map([...reusedComponents, ...activatedComponents]);

    const beforeResolveAbort = (await Promise.all(beforeResolveGuards.map(guard => guard(newRoute, currentRoute)))).find(result => result);
    if (beforeResolveAbort) throw new Error(`OzRouter: naviguation aborted, beforeResolve returned:\n${JSON.stringify(beforeResolveAbort)}`)

    state.currentRoute = newRoute;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', newRoute.fullPath);

    afterEachHooks.forEach(hook => hook(newRoute, currentRoute));
  };

  const router = reactify({
    set __rootElementContext__ (__rootElementContext__) { state.__rootElementContext__ = __rootElementContext__; },
    get __rootElementContext__ () { return state.__rootElementContext__ },
    get url () { return new URL(state.fullPath) },
    get path () { return router.url.pathname },
    get hash () { return router.url.hash },
    get query () { return state.currentRoute && state.currentRoute.query },
    get params () { return state.currentRoute && state.currentRoute.params },
    get matched () { return state.currentRoute && state.currentRoute.matched },
    get name () { return state.currentRoute && state.currentRoute.matched[state.currentRoute.matched.length - 1].name },
    get currentRoute () { return state.currentRoute },
    get currentRoutesComponents () { return state.currentRoutesComponents },
    back () { return router.go(-1) },
    forward () { return router.go(1) },
    go (num) { return window.history.go(num) },
    match: resolve,
    push: goTo.bind(undefined, false),
    replace: goTo.bind(undefined, true)
  });
  window.addEventListener('popstate', ev => router.replace(location.pathname));
  router.replace(location.pathname);
  performance.mark('OzRouter initialized');
  performance.measure('OzRouter initialization', 'OzRouter initialization', 'OzRouter initialized');
  return router
};

const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
const regex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`);
const globalRegex = new RegExp(`oz-template-placeholder-(\\d*)-${random}`, 'g');
const placeholder$2 = id => `oz-template-placeholder-${id}-${random}`;
const split$3 = str => str.split(globalRegex);
const getSplitValueIndexes$1 = split => split.filter((str, i) => i % 2);
const mergeSplitWithValues$2 = (split, values) => split.map((str, i) => i % 2 ? values[str] : str).join('');
const mergeSplitWithPlaceholders$2 = strings => strings[0] + [...strings].splice(1).map((str, i) => placeholder$2(i) + str).join('');
const indexPlaceholders$1 = placeholders => placeholders.reduce((arr, placeholder) => [...arr, ...(placeholder.indexes || [placeholder.index]).map(id => placeholder)], []);
const ref$1 = name => ({ htmlReference: true, name });

var comment = ({ values, node, placeholder: { split } }) => {
  node.nodeValue = mergeSplitWithValues$2(split, values);
  return { node }
}

const text = ({
  value,
  values,
  getChildNodes,
  setChildNodes,
  nodes = [],
  data: { instance: oldInstance, unlisten: oldUnlisten, textArray: oldTextArray = [] } = {},
  placeholder: { index } = {}
}) => {
  if (oldUnlisten) oldUnlisten();
  if (values && !value) value = values[index];
  if (typeof value === 'string' || typeof value === 'number') {
    if (nodes[0] instanceof Text) {
      if (nodes[0].nodeValue !== value) nodes[0].nodeValue = value;
      return { nodes: [nodes[0]] }
    } else {
      return { nodes: [new Text(value)] }
    }
  } else if (value instanceof Node) {
    if (nodes[0] !== value) return { nodes: [value] }
  } else if (value && value.build && !value.$promise) {
    if (oldInstance && oldInstance.instance && oldInstance.id === value.id) {
      oldInstance.update(...value.values);
      return { nodes: oldInstance._childNodes, data: { instance: oldInstance } }
    } else {
      const instance = value();
      const unlisten = instance.listen((newChildNodes, oldChildNodes) => {
        setChildNodes(newChildNodes);
        // const currentChildNodes = getChildNodes()
        // setChildNodes(Object.assign([...currentChildNodes], {[currentChildNodes.indexOf(oldChildNodes)]: newChildNodes}))
      });
      return { nodes: instance._childNodes, data: { instance, unlisten } }
    }
  } else if (value && value.instance && !value.$promise) {
    const unlisten = value.listen((newChildNodes, oldChildNodes) => {
      setChildNodes(newChildNodes);
    });
    return { nodes: value._childNodes, data: { instance: value, unlisten } }
  } else if (Array.isArray(value)) {
    if (value.length === 0) value = [undefined];
    // todo: add more of the parameters to cover all of the simple text features
    const textArray = value.map((value, i) => {
      const oldText = oldTextArray[i];
      const _text = text({
        value,
        nodes: oldText && oldText.nodes,
        data: oldText && oldText.data
      });
      return _text
    });
    return { nodes: textArray.map(({nodes}) => nodes), data: { textArray } }
  } else if (value && value.$promise) {
    return { nodes: [ new Text('') ] }
  } else {
    return { nodes: [ nodes[0] instanceof Comment ? nodes[0] : new Comment('') ] }
  }
};

var tag = ({ values, node, placeholder: { split } }) => {
  const newTag = mergeSplitWithValues$2(split, values);
  return {
    node: node.tagName.toLowerCase() === newTag.toLowerCase()
      ? node
      : document.createElement(newTag)
  }
}

var attribute$1 = ({ refs, values, placeholder, node, data: { name: oldName, listener: oldListener, value: oldValue } = {}, placeholder: { type, indexes, attributeType, nameSplit, valueSplit } }) => {
  if (oldListener) node.removeEventListener(oldName, oldValue);
  const name = mergeSplitWithValues$2(nameSplit, values);
  const value = attributeType === '' ? values[valueSplit[1]] : mergeSplitWithValues$2(valueSplit, values); // mergeSplitWithValues(valueSplit, values)
  if (attributeType === '"') { // double-quote
    node.setAttribute(name, value);
  } else if (attributeType === '\'') {  // single-quote
    node.setAttribute(name, value);
  } else if (attributeType === '') {  // no-quote
    let isEvent = name.startsWith('on-') ? 1 : name.startsWith('@') ? 2 : 0;
    if (isEvent) { // Event handling
      const listenerName = name.substring(isEvent === 1 ? 3 : 1);
      node.addEventListener(listenerName, value);
      return { node, data: { name: listenerName, listener: true, value } }
    } else if (nameSplit.length === 3 && nameSplit[1] && values[nameSplit[1]].htmlReference) {
      refs.set(values[nameSplit[1]].name, node);
    } else if (value && typeof value === 'object' && value.htmlReference) {
      node[name] = refs.get(value.name);
    } else {
      node[name] = value;
    }
  }
  return {node, data: { name }}
}

const update$1 = {
  comment,
  text,
  tag,
  attribute: attribute$1
};

const getNode$1 = (node, path) => path.reduce((currNode, i) => currNode.childNodes.item(i), node);

const flattenArray$2 = arr => arr.reduce((arr, item) => Array.isArray(item) ? [...arr, ...flattenArray$2(item)] : [...arr, item], []);

const getValueIndexDifferences$1 = (arr, arr2) => arr2.length > arr.length
  ? getValueIndexDifferences$1(arr2, arr)
  : arr.reduce((arr, item, i) =>
    [
      ...arr,
      ...item !== arr2[i] ? [i] : []
    ], []);

var createInstance$2 = ({ id, template, placeholders }, ...values) => {
  const doc = document.importNode(template.content, true);
  let bypassDif = true;
  let childNodes = [...doc.childNodes];
  let listeners = [];
  let placeholdersNodes = new Map(placeholders.map(placeholder => (
    [
      placeholder,
      placeholder.type === 'text' ? [getNode$1(doc, placeholder.path)] : getNode$1(doc, placeholder.path)
    ]
  )));
  let placeholdersData = new Map(placeholders.map(placeholder => [placeholder, {}]));
  let placeholderByIndex = indexPlaceholders$1(placeholders);

  const updatePlaceholder = ({ values, placeholder, refs }) => {
    const currentData = placeholdersData.get(placeholder);
    if (currentData && currentData.directive) currentData.directive(); // cleanup directive function
    const index = placeholder.index || placeholder.indexes[0];
    const directive = values[index];
    const data = placeholdersData.get(placeholder);
    const node = placeholdersNodes.get(placeholder);

    const replaceNode = (newNode, node) => {
      placeholdersNodes = new Map([...placeholdersNodes, [placeholder, newNode]]
        .map(([_placeholder, _node]) => node === _node
        ? [_placeholder, newNode]
        : [_placeholder, _node])
      );
      childNodes = Object.assign([...childNodes], {[childNodes.indexOf(node)]: newNode});
      const { parentNode } = node;
      if (parentNode) {
        parentNode.insertBefore(newNode, node);
        parentNode.removeChild(node);
      }
    };

    const replaceNodes = (newArray, oldArray) => {
      placeholdersNodes = new Map([...placeholdersNodes, [placeholder, newArray]]);
      childNodes = Object.assign([...childNodes], {[childNodes.indexOf(oldArray)]: newArray});
      newArray = flattenArray$2(newArray);
      oldArray = flattenArray$2(oldArray);
      const nodesToRemove = oldArray.filter(node => !newArray.includes(node));
      for (const i in newArray) {
        const newNode = newArray[i];
        const oldNode = oldArray[i];
        if (newNode !== oldNode) {
          if (oldNode && oldNode.parentNode) {
            oldNode.parentNode.insertBefore(newNode, oldNode);
            oldNode.parentNode.removeChild(oldNode);
          } else {
            const previousNewNode = newArray[i - 1];
            if (previousNewNode && previousNewNode.parentNode) {
              previousNewNode.parentNode.insertBefore(newNode, previousNewNode.nextSibling);
              if (oldNode && oldNode.parentNode) oldNode.parentNode.removeChild(oldNode);
            }
          }
        }
      }
      for (const node of nodesToRemove) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
      }
    };

    const setElement = newElement => {
      const element = placeholdersNodes.get(placeholder);
      const elementPlaceholders = placeholder.attributes.map(indexes => placeholderByIndex[indexes[0]]);
      for (const {name, value} of element.attributes) newElement.setAttribute(name, value);
      for (const childNode of element.childNodes) newElement.appendChild(childNode);
      replaceNode(newElement, element);
      for (const placeholder of elementPlaceholders) updatePlaceholder({values, placeholder, refs});
    };
    if (placeholder.type === 'attribute' && placeholder.indexes.length === 1 && directive && directive.directive) { // placeholder value is a directive
      placeholdersData = new Map([...placeholdersData, [
        placeholder,
        { directive: directive({ getElement: placeholdersNodes.get.bind(placeholdersNodes, placeholder), setElement }) }
      ]]);
    } else {
      const updateResult = update$1[placeholder.type]({
        refs,
        placeholder,
        values,
        data,
        [placeholder.type === 'text' ? 'nodes' : 'node']: node,
        placeholderByIndex,
        getChildNodes () { return instance._childNodes },
        setChildNodes: newChildNodes => {
          const _childNodes = childNodes;
          childNodes = newChildNodes;
          for (const listener of listeners) listener(childNodes, _childNodes);
        }
      });
      if (placeholder.type === 'text') {
        if (node !== updateResult.nodes) replaceNodes(updateResult.nodes, node);
      } else if (placeholder.type === 'tag' || placeholder.type === 'attribute') {
        if (node !== updateResult.node) setElement(updateResult.node);
      } else {
        if (node !== updateResult.node) replaceNode(updateResult.node, node);
      }
      placeholdersData = new Map([...placeholdersData, [placeholder, updateResult.data]]);
    }
    for (const listener of listeners) listener(childNodes, node);
  };

  const instance = {
    id,
    values,
    refs: new Map(),
    instance: true,
    __reactivity__: false,
    get _childNodes () { return childNodes },
    get childNodes () { return flattenArray$2(childNodes) },
    get content () {
      for (const node of instance.childNodes) doc.appendChild(node);
      return doc
    },
    update (...values) {
      const placeholdersToUpdate =
      bypassDif // if bypass, update all the placeholders (first placeholder setup)
      ? placeholders // all placeholders
      : getValueIndexDifferences$1(values, instance.values) // placeholders which split values has changed
        .map(index => placeholderByIndex[index]) // placeholders
        .filter(placeholder => placeholder && placeholdersNodes.get(placeholder));
      instance.values = values;
      const refPlaceholders = placeholdersToUpdate.filter(({nameSplit}) => nameSplit && nameSplit.length === 3 && nameSplit[1] && values[nameSplit[1]].htmlReference);
      const normalPlaceholders = placeholdersToUpdate.filter(({nameSplit}) => !(nameSplit && nameSplit.length === 3 && nameSplit[1] && values[nameSplit[1]].htmlReference));
      for (const placeholder of [...refPlaceholders, ...normalPlaceholders]) updatePlaceholder({placeholder, values, refs: instance.refs});
    },
    listen (func) {
      listeners = [...listeners, func];
      return _ => (listeners = Object.assign([...listeners], {[listeners.indexOf(func)]: undefined}).filter(item => item))
    }
  };
  const textPlaceholdersByFirstNode = new Map(placeholders.filter(({type}) => type === 'text').map(placeholder => [placeholdersNodes.get(placeholder)[0], placeholder]));
  childNodes = childNodes.reduce((arr, node) =>
    textPlaceholdersByFirstNode.has(node)
    ? [...arr, placeholdersNodes.get(textPlaceholdersByFirstNode.get(node))]
    : [...arr, node]
  , []);
  instance.update(...values);
  bypassDif = false;
  // console.log('created', id)
  return instance
}

const attribute$2 = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const ncname$1 = '[a-zA-Z_][\\w\\-\\.]*';
const qnameCapture$1 = `((?:${ncname$1}\\:)?${ncname$1})`;
const startTagOpen$1 = new RegExp(`^<${qnameCapture$1}`);
const startTagClose$1 = /^\s*(\/?)>/;
const endTag$1 = new RegExp(`^<\\/(${qnameCapture$1}[^>]*)>`);

const parseAttributes$1 = ({leftHTML = '', rightHTML, attributes = []}) => {
  const tagCloseMatch = rightHTML.match(startTagClose$1);
  if (tagCloseMatch) return { attributes: attributes, leftHTML: leftHTML, rightHTML }
  const match = rightHTML.match(attribute$2);
  if (!match) throw new SyntaxError(`Oz html template attribute parsing: tag isn't closed.`)
  const attrNameSplit = split$3(match[1]);
  const attributeValue = match[3] || match[4] || match[5];
  const attrValueSplit = attributeValue ? split$3(attributeValue) : [''];
  const indexes = [...getSplitValueIndexes$1(attrNameSplit), ...getSplitValueIndexes$1(attrValueSplit)];
  return parseAttributes$1({
    leftHTML: `${leftHTML} ${indexes.length ? placeholder$2(indexes[0]) : match[0]}`,
    rightHTML: rightHTML.substring(match[0].length),
    attributes: indexes.length ? [...attributes, {
      type: match[3] ? '"' : match[4] ? '\'' : '',
      nameSplit: attrNameSplit,
      valueSplit: attrValueSplit,
      indexes
    }] : attributes
  })
};

const parsePlaceholders$2 = ({ htmlArray, values, placeholders = [], leftHTML = '', rightHTML }) => {
  if (rightHTML === undefined) return parsePlaceholders$2({ values, rightHTML: mergeSplitWithPlaceholders$2(htmlArray) })
  if (!rightHTML.length) return { placeholders, html: leftHTML }
  const _textEnd = rightHTML.indexOf('<');
  const isComment = rightHTML.startsWith('<!--');
  if (_textEnd || isComment) {
    const textEnd = _textEnd === -1 ? rightHTML.length : _textEnd;
    const commentEnd = isComment ? rightHTML.indexOf('-->') : undefined;
    if (isComment && commentEnd === -1) throw new Error(`Comment not closed, can't continue the template parsing "${rightHTML.substring(0, textEnd)}"`)
    const textContent = rightHTML.substring(isComment ? 4 : 0, isComment ? commentEnd : textEnd);
    const textSplit = split$3(textContent);
    const hasPlaceholder = textSplit.length > 1;
    const indexes = getSplitValueIndexes$1(textSplit);
    return parsePlaceholders$2({
      values,
      placeholders: hasPlaceholder ? [...placeholders, {
        type: isComment ? 'comment' : 'text',
        indexes: getSplitValueIndexes$1(textSplit),
        split: textSplit
      }] : placeholders,
      leftHTML: leftHTML + (isComment ? `<!--${hasPlaceholder ? placeholder$2(indexes[0]) : textContent}-->` : textContent),
      rightHTML: rightHTML.substring(isComment ? commentEnd + 3 : textEnd)
    })
  }
  const startTagMatch = rightHTML.match(startTagOpen$1);
  if (startTagMatch) {
    const tagSplit = split$3(startTagMatch[1]);
    const hasPlaceholder = tagSplit.length > 1;
    const indexes = getSplitValueIndexes$1(tagSplit);
    const {
      attributes,
      leftHTML: _leftHTML,
      rightHTML: _rightHTML
    } = parseAttributes$1({rightHTML: rightHTML.substring(startTagMatch[0].length)});
    const attributePlaceholders = attributes.map(({type, ...rest}) => ({
      type: 'attribute',
      attributeType: type,
      tag: indexes,
      attributes: attributes.map(({indexes}) => indexes).filter(indexes => rest.indexes !== indexes),
      ...rest
    }));
    return parsePlaceholders$2({
      values,
      placeholders: [...placeholders, ...hasPlaceholder ? [{
        type: 'tag',
        indexes,
        split: tagSplit,
        attributes: attributes.map(({indexes}) => indexes)
      }] : [],
        ...attributePlaceholders.length ? attributePlaceholders : []],
      leftHTML: `${leftHTML}<${mergeSplitWithValues$2(tagSplit, values)}${hasPlaceholder ? ` ${placeholder$2(indexes[0])} ` : ''}${_leftHTML}`,
      rightHTML: _rightHTML
    })
  }
  const endTagMatch = rightHTML.match(endTag$1);
  if (endTagMatch) {
    const tagSplit = split$3(endTagMatch[1]);
    return parsePlaceholders$2({
      values,
      placeholders,
      leftHTML: `${leftHTML}</${mergeSplitWithValues$2(tagSplit, values)}>`,
      rightHTML: rightHTML.substring(endTagMatch[0].length)
    })
  }
};

const getSiblingIndex$1 = ({previousSibling} = {}, i = 0) => previousSibling ? getSiblingIndex$1(previousSibling, i + 1) : i;

const getNodePath$1 = ({node, node: {parentElement: parent} = {}, path = []}) => parent
  ? getNodePath$1({node: parent, path: [...path, [...parent.childNodes].indexOf(node)]})
  : [...path, getSiblingIndex$1(node)].reverse();

const getPlaceholderWithPaths$2 = (node, _placeholders) => {
  const placeholders = _placeholders.reduce((arr, placeholder$$1) => [...arr, ...placeholder$$1.type === 'text'
    ? [...placeholder$$1.indexes.map(index => ({type: 'text', index}))]
    : [placeholder$$1]]
  , []);
  const placeholderByIndex = indexPlaceholders$1(placeholders);
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT + NodeFilter.SHOW_TEXT, undefined, false);
  const nodes = new Map();
  const paths = new Map();
  const nodesToRemove = [];
  while (walker.nextNode()) {
    const currentNode = walker.currentNode;
    const match = currentNode.nodeValue.match(regex);
    if (match) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const placeholderNode = currentNode.splitText(match.index);
        placeholderNode.nodeValue = placeholderNode.nodeValue.substring(match[0].length);
        if (placeholderNode.nodeValue.length) placeholderNode.splitText(0);
        if (!currentNode.nodeValue.length) nodesToRemove.push(currentNode); // currentNode.parentNode.removeChild(currentNode)
        nodes.set(placeholderByIndex[match[1]], placeholderNode);
      } else if (currentNode.nodeType === Node.COMMENT_NODE) {
        nodes.set(placeholderByIndex[match[1]], currentNode);
      }
    }
  }
  for (const node of nodesToRemove) node.parentNode.removeChild(node);
  for (const placeholder$$1 of placeholders) {
    const type = placeholder$$1.type;
    paths.set(placeholder$$1, getNodePath$1({node: nodes.get(placeholder$$1)}));
    if (type === 'attribute' || type === 'tag') {
      const attributeName = placeholder$2(placeholder$$1.indexes[0]);
      const foundNode = node.querySelector(`[${attributeName}]`);
      foundNode.removeAttribute(attributeName);
      paths.set(placeholder$$1, getNodePath$1({node: foundNode}));
    }
  }
  return [...paths].map(([placeholder$$1, path]) => ({...placeholder$$1, path}))
};

const createBuild$1 = ({id, html, placeholders: _placeholders}) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  if (!template.content.childNodes.length) template.content.appendChild(new Comment());
  const placeholders = getPlaceholderWithPaths$2(template.content, _placeholders);
  return values => {
    const _createInstance = createInstance$2.bind(undefined, { id, template, placeholders }, ...values);
    _createInstance.build = true;
    _createInstance.id = id;
    _createInstance.values = values;
    return _createInstance
  }
};

const cache$1 = new Map();

const tag$1 = transform => (strings, ...values) => {
  if (typeof strings === 'string') strings = [strings];
  const id = 'html' + strings.join(placeholder$2(''));
  if (cache$1.has(id)) return cache$1.get(id)(values)
  const { html, placeholders } = parsePlaceholders$2({htmlArray: split$3(transform ? transform(mergeSplitWithPlaceholders$2(strings)) : mergeSplitWithPlaceholders$2(strings)).filter((str, i) => !(i % 2)), values});
  const placeholdersWithFixedTextPlaceholders = placeholders.reduce((arr, placeholder$$1) => [...arr,
    ...placeholder$$1.type === 'text'
    ? placeholder$$1.indexes.map(index => ({ type: 'text', indexes: [index], split: ['', index, ''] }))
    : [placeholder$$1]
  ], []);
  const build = createBuild$1({ id, html, placeholders: placeholdersWithFixedTextPlaceholders });
  cache$1.set(id, build);
  return build(values)
};

const html$2 = tag$1();
html$2.ref = ref$1;

const random$1 = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);

const placeholderRegex$1 = /[\u{E000}-\u{F8FF}]/umg;
const placeholder$4 = (n = 0) => String.fromCodePoint(0xE000 + n);
const charToN = str => -(0xE000 - str.codePointAt());

const parseRule = (rule, placeholders) => {
  rule.selectors.forEach(selector =>
    (selector.match(placeholderRegex$1) || [])
      .forEach(match => (placeholders[charToN(match)] = {
        type: 'style selector',
        rule
      })));

  rule.declarations.forEach(declaration => {
    const { name, value } = declaration;
    const nameMatch = name.match(placeholderRegex$1);
    if (nameMatch) {
      if (!declaration.name.startsWith('--')) declaration.name = '--' + declaration.name;
      nameMatch.forEach(match => (placeholders[charToN(match)] = {
        type: 'declaration name',
        declaration
      }));
    }
    const valueMatch = value.match(placeholderRegex$1);
    if (valueMatch) {
      declaration.value = value.replace(placeholderRegex$1, ' var(--$&) ');
      valueMatch.forEach(match => (placeholders[charToN(match)] = {
        type: 'declaration value',
        declaration
      }));
    }
  });
};

const parseMedia = (media, _placeholders) => {
  if (media.rules) media.rules.forEach(parseRule);
  const name = media.name;
  const placeholders = media.name.match(placeholderRegex$1);
  placeholders.forEach(match => (_placeholders[charToN(match)] = {
    type: 'media condition',
    media,
    name
  }));
  media.name = placeholders.reduce((str, placeholder) => `${str} and (aspect-ratio: ${charToN(placeholder) + 1}/9999)`, '');
};
// CSSMediaRule.media.appendMedium / CSSMediaRule.media.mediaText
// https://developer.mozilla.org/en-US/docs/Web/API/StyleSheet/media
// (aspect-ratio: 10/1230) and (aspect-ratio: 11/1230)

const parseKeyframe = (keyframe, placeholders) =>
  keyframe.rules &&
  (keyframe.rules.forEach(parseRule) || true) &&
  (keyframe.name.match(placeholderRegex$1) || [])
    .forEach(match => (placeholders[charToN(match)] = {
      type: 'keyframe name',
      keyframe
    }));

const parseStyleSheet = (styleSheet, placeholders) => styleSheet.rules.map(rule =>
  rule.type === 'rule'
    ? parseRule(rule, placeholders)
    : rule.type === 'media'
      ? parseMedia(rule, placeholders)
      : rule.type === 'keyframes'
        ? parseKeyframe(rule, placeholders)
        : undefined);

const parse$1 = (_str, placeholders = []) => {
  const str = _str.reduce((fullStr, currentStr, i) => fullStr + currentStr + placeholder$4(i), '');
  console.log(str);
  const ast = mensch.parse(str);
  console.log(ast);
  parseStyleSheet(ast.stylesheet, placeholders);
  return placeholders
};

console.log(((strings, ...values) => parse$1(strings))`
bruh:before ${'lol'} {
  content: " yayaya { lul }";
}

.polling_message --bruh {
  color: ${'white'};
  float${'lmao'}: left;
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
@keyframes move_eye ${'bruh'} { bruh dude { margin-left: -20%; } to { margin-left: 100%; }  }

@media screen and (min-width: ${30}em) and (orientation: landscape){

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

}
`);

const voidTags = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr'];

const regex$2 = /^(\s*)(?:(\|)|(?:([.#\w-]*)(?:\(([\s\S]*?)\))?))(?: (.*))?/;
const gRegex = new RegExp(regex$2, 'gm');

const identifierRegex = /(?:(\.)|(#))([a-z0-9-]*)/;
const gIdentifierRegex = new RegExp(identifierRegex, 'g');
const classRegex = /class="(.*)"/;

const makeHTML = ({tag: tag$$1, attributes, childs, textContent, id, classList}) => {
  const classStr = classList.join(' ');
  let attrStr = attributes ? ' ' + attributes : '';
  if (attrStr.match(classRegex)) attrStr = attrStr.replace(classRegex, (match, classes) => `class="${classes} ${classStr}"`);
  else if (classStr) attrStr += ` class="${classStr}"`;
  if (tag$$1) return `<${tag$$1}${id ? ` id="${id}"` : ''}${attrStr}>${textContent || ''}${childs.map(line => makeHTML(line)).join('')}${voidTags.includes(tag$$1) ? '' : `</${tag$$1}>`}`
  else return '\n' + textContent
};

const pushLine = ({childs: currentChilds}, line) => {
  if (currentChilds.length && currentChilds[currentChilds.length - 1].indentation < line.indentation) pushLine(currentChilds[currentChilds.length - 1], line);
  else currentChilds.push(line);
};
const hierarchise = arr => {
  const hierarchisedArr = [];
  for (let line of arr) {
    if (hierarchisedArr.length && hierarchisedArr[hierarchisedArr.length - 1].indentation < line.indentation && hierarchisedArr[hierarchisedArr.length - 1].childs) pushLine(hierarchisedArr[hierarchisedArr.length - 1], line);
    else hierarchisedArr.push(line);
  }
  return hierarchisedArr
};

const pozToHTML = str =>
  hierarchise(
    str
    .match(gRegex)
    .map(str => str.match(regex$2))
    .filter(match => match[0].trim().length)
    .map(match => {
      if (match[3] && !match[3].replace(regex, '').trim().length) {
        return { indentation: match[1].split('\n').pop().length, textContent: match[3], classList: [] }
      }
      const tag$$1 = match[3] ? match[3].match(/^([a-z0-9-]*)/)[1] : undefined;
      const identifiers = match[3] ? match[3].slice(tag$$1.length).match(gIdentifierRegex) || [] : [];
      const id = identifiers.find(identifier => identifier.match(identifierRegex)[2]);
      const classList = identifiers.filter(identifier => identifier.match(identifierRegex)[1]).map(str => str.slice(1));
      return {
        indentation: match[1].split('\n').pop().length,
        tag: match[2]
          ? undefined
          : tag$$1 || 'div',
        attributes: match[4],
        id,
        classList,
        textContent: match[5],
        childs: []
      }
    })
  )
  .map(line => makeHTML(line))
  .join('');

const poz = tag$1(pozToHTML);

// export { html, ref } from './html.js'

const bind = (obj, prop, event) => {
  const func = ({getElement}) => {
    const element = getElement();
    element.value = obj[prop];
    let unwatch = watch(_ => obj[prop], value => (element.value = value));
    const listener = ({target: {value}}) => event ? undefined : (obj[prop] = value);
    let event = element.addEventListener('input', listener);
    return _ => {
      unwatch();
      element.removeEventListener('input', listener);
    }
  };
  func.directive = true;
  return func
};

exports.setReactiveRootSymbol = setReactiveRootSymbol;
exports.setReactivitySymbol = setReactivitySymbol;
exports.setReactiveRoot = setReactiveRoot;
exports.reactivityProperties = reactivityProperties;
exports.setObjectReactivity = setObjectReactivity;
exports.reactify = reactify;
exports.notify = notify;
exports.registerWatcher = registerWatcher;
exports.propertyReactivity = propertyReactivity;
exports.includeWatcher = includeWatcher;
exports.registerDependency = registerDependency;
exports.watch = watch;
exports.r = reactify;
exports.react = reactify;
exports.registerElement = registerElement;
exports.mixin = mixin;
exports.pushContext = pushContext;
exports.elementContext = elementContext;
exports.RouterView = RouterView;
exports.Router = Router;
exports.html = html$2;
exports.tag = tag$1;
exports.ref = ref$1;
exports.css = css$1;
exports.poz = poz;
exports.bind = bind;
exports.UUID = UUID;
exports.isObject = isObject;
exports.flattenArray = flattenArray;
exports.ignoreObjectTypes = ignoreObjectTypes;
exports.builtInObjects = builtInObjects;
exports.isIgnoredObjectType = isIgnoredObjectType;
exports.isBuiltIn = isBuiltIn;
exports.cloneObject = cloneObject;
exports.getPropertyDescriptorPair = getPropertyDescriptorPair;
exports.hasProperty = hasProperty;
exports.getPropertyDescriptor = getPropertyDescriptor;
exports.getPropertyDescriptorPrototype = getPropertyDescriptorPrototype;
