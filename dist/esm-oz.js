import { NodeFactory, Stringifier, Parser } from 'shady-css-parser';
import pathToRegexp, { compile } from 'path-to-regexp';

// placeholders first range U+E000..U+F8FF
const placeholderMinRangeChar = '';
const placeholderMinRangeCode = placeholderMinRangeChar.codePointAt();
const placeholderMaxRangeChar = '';
const placeholderRegex = new RegExp(`[${placeholderMinRangeChar}-${placeholderMaxRangeChar}]`, 'umg'); // /[-]/umg

const singlePlaceholderRegex = new RegExp(placeholderRegex, 'um');
const placeholder = (n = 0) => String.fromCodePoint(placeholderMinRangeCode + n);
const charToN = str => str.codePointAt() - placeholderMinRangeCode;
const toPlaceholdersNumber = str => (str.match(placeholderRegex) || []).map(i => charToN(i));
const toPlaceholderString = (str, placeholders = toPlaceholdersNumber(str)) => values => placeholders.reduce((str, i) => str.replace(placeholder(i), values[i]), str);
const replace = (arrayFragment, ...vals) => arrayFragment.splice(0, arrayFragment.length, ...vals); // placeholders first range U+E000..U+F8FF //
// placeholders second range U+F0000..U+FFFFD

const placeholder2MinRangeChar = '󰀀';
const placeholder2MinRangeCode = placeholder2MinRangeChar.codePointAt();
const placeholder2MaxRangeChar = '󿿽';
const placeholder2Regex = new RegExp(`[${placeholder2MinRangeChar}-${placeholder2MaxRangeChar}]`, 'umg'); // /[󰀀-󿿽]/umg
const placeholder2 = (n = 0) => String.fromCodePoint(placeholder2MinRangeCode + n);
const charToN2 = str => str.codePointAt() - placeholder2MinRangeCode;
const matchSelectorRulesets = (str, matchedStrRuleset = []) => str.replace(/(".*?"|'.*?'|:-webkit-any\(.*?\))/g, (_, str) => placeholder2(matchedStrRuleset.push(str))).split(',').map(str => str.replace(placeholder2Regex, char => matchedStrRuleset[charToN2(char) - 1]).trim()); // placeholders second range U+F0000..U+FFFFD //

var makeComment = (({
  placeholderMetadata,
  arrayFragment,
  getResult = toPlaceholderString(placeholderMetadata.values[0])
}) => ({
  values,
  forceUpdate
}) => arrayFragment[0].data = getResult(values));

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    var ownKeys = Object.keys(source);

    if (typeof Object.getOwnPropertySymbols === 'function') {
      ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
        return Object.getOwnPropertyDescriptor(source, sym).enumerable;
      }));
    }

    ownKeys.forEach(function (key) {
      _defineProperty(target, key, source[key]);
    });
  }

  return target;
}

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};

  var target = _objectWithoutPropertiesLoose(source, excluded);

  var key, i;

  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }

  return target;
}

const OzElement = Symbol.for('OzElement');
const OzElementContext = Symbol.for('OzElementContext');
const mixins = [];
const mixin = obj => mixins.push(obj);
const getMixinProp = (mixins, prop) => mixins.filter(mixin => prop in mixin).map(mixin => mixin[prop]);
const htmlTemplateChangedError = new Error('The HTML template returned in the template method changed');
const noHTMLTemplateError = new Error('No HTML template returned in the template method');
const ozStyleChangedError = new Error('The OzStyle element returned in the style changed');
const noOzStyleError = new Error('No OzStyle element returned in the style method');

const getPropertyDescriptorPair = (prototype, property) => {
  let descriptor = Object.getOwnPropertyDescriptor(prototype, property);

  while (!descriptor) {
    prototype = Object.getPrototypeOf(prototype);
    if (!prototype) return;
    descriptor = Object.getOwnPropertyDescriptor(prototype, property);
  }

  return {
    prototype,
    descriptor
  };
};
const getPropertyDescriptor = (object, property) => {
  var _getPropertyDescripto;

  return (_getPropertyDescripto = getPropertyDescriptorPair(object, property)) === null || _getPropertyDescripto === void 0 ? void 0 : _getPropertyDescripto.descriptor;
};
const getClosestOzElementParent = (node, parentNode = node.parentNode || node.host, isOzElement = parentNode && parentNode[OzElement]) => isOzElement ? parentNode : parentNode && getClosestOzElementParent(parentNode);

var proxify = (object => {
  const proxy = new Proxy(object, {
    get(target, property, receiver) {
      if (reactivityProperties.includes(property)) return Reflect.get(target, property, receiver);
      registerDependency({
        target,
        property
      });

      const propertyReactivity$$1 = propertyReactivity(target, property);

      const descriptor = getPropertyDescriptor(target, property);
      let value;

      if (descriptor && 'value' in descriptor) {
        // property
        value = Reflect.get(target, property, receiver);
      } else {
        // getter
        if ('cache' in propertyReactivity$$1) {
          value = propertyReactivity$$1.cache;
        } else {
          value = registerWatcher(_ => propertyReactivity$$1.cache = Reflect.get(target, property, receiver), _ => notify({
            target: proxy,
            property
          }), {
            object,
            property,
            propertyReactivity: propertyReactivity$$1,
            cache: true
          });
        }
      }

      return value;
    },

    deleteProperty(target, property) {
      if (reactivityProperties.includes(property)) return Reflect.deleteProperty(target, property);

      try {
        return Reflect.deleteProperty(target, property);
      } finally {
        notify({
          target: proxy,
          property
        });
        const {
          properties
        } = target[reactivity];
        if (!properties.get(property).watchers.length) properties.delete(property);
      }
    },

    defineProperty(target, property, desc, _ref = desc
    /* desc */
    ) {
      let {
        value: _value
      } = _ref,
          rest = _objectWithoutProperties(_ref, ["value"]);

      if (reactivityProperties.includes(property)) return Reflect.defineProperty(target, property, desc);

      if (!_value) {
        try {
          // return Reflect.defineProperty(target, property, desc) // TODO: find why the hell this doesn't work
          return Reflect.defineProperty(target, property, _objectSpread({}, _value !== undefined && {
            value: _value
          }, rest));
        } finally {
          notify({
            target: proxy,
            property,
            value: _value
          });
        }
      }

      let value = reactify(_value);

      try {
        return Reflect.defineProperty(target, property, _objectSpread({}, value !== undefined && {
          value: value
        }, rest));
      } finally {
        if (value && typeof value === 'object' && value[reactivity]) {
          let unwatch = value.$watch(_ => target[property] === value ? notify({
            target: proxy,
            property,
            value,
            deep: true
          }) : unwatch(), {
            deep: true
          });
        }

        notify({
          target: proxy,
          property,
          value
        });
      }
    }

  });
  return proxy;
});

const type = Object;
var object = (object => {
  const obj = Object.create(Object.getPrototypeOf(object));
  const reactiveObject = proxify(obj);
  setReactivity({
    target: reactiveObject,
    original: object,
    object: obj
  });

  for (const [prop, {
    value,
    ...rest
  }] of Object.entries(Object.getOwnPropertyDescriptors(object))) {
    Object.defineProperty(reactiveObject, prop, _objectSpread({}, value !== undefined && {
      value: value
    }, rest));
  }

  return reactiveObject;
});

var object$1 = /*#__PURE__*/Object.freeze({
  type: type,
  default: object
});

const type$1 = Array;
let original;
const ReactiveType = class ReactiveArray extends Array {
  constructor(...values) {
    super();
    const proxy = proxify(this);
    setReactivity({
      target: proxy,
      original,
      object: this
    });
    if (original) original = undefined;

    if (values) {
      for (const val of values) proxy.push(val);
    }

    values.forEach((val, i) => proxy[i] = val);
    return proxy;
  }

};
var array = (array => {
  original = array;
  return new ReactiveType(...array);
});

var array$1 = /*#__PURE__*/Object.freeze({
  type: type$1,
  ReactiveType: ReactiveType,
  default: array
});

const type$2 = Map;
const getProperty = (reactiveMap, prop) => reactiveMap.get(prop);
const ReactiveType$1 = class ReactiveMap extends Map {
  constructor(iterator) {
    super();
    setReactivity({
      target: this,
      original: iterator,
      object: this
    });
    if (iterator) for (const [key, val] of iterator) this.set(key, val);
  }

  get size() {
    registerDependency({
      target: this
    });
    return super.size;
  }

  set(key, val) {
    const value = reactify(val);

    try {
      return super.set(key, value);
    } finally {
      notify({
        target: this,
        property: key,
        value
      });
    }
  }

  delete(key) {
    try {
      return super.delete(key);
    } finally {
      var _properties$get;

      notify({
        target: this,
        property: key
      });
      const {
        properties
      } = this[reactivity];
      if (!((_properties$get = properties.get(key)) === null || _properties$get === void 0 ? void 0 : _properties$get.watchers.length)) properties.delete(key);
    }
  }

  clear() {
    try {
      return super.clear();
    } finally {
      notify({
        target: this
      });
      const {
        properties
      } = this[reactivity];

      for (const [key] of this) {
        var _properties$get2;

        if (!((_properties$get2 = properties.get(key)) === null || _properties$get2 === void 0 ? void 0 : _properties$get2.watchers.length)) properties.delete(key);
      }

      for (const [key] of properties) {
        var _properties$get3;

        if (!((_properties$get3 = properties.get(key)) === null || _properties$get3 === void 0 ? void 0 : _properties$get3.watchers.length)) properties.delete(key);
      }
    }
  }

  get(key) {
    propertyReactivity(this, key);
    registerDependency({
      target: this,
      property: key
    });
    return super.get(key);
  }

  has(key) {
    registerDependency({
      target: this,
      property: key
    });
    return super.has(key);
  }

};

for (const property of ['entries', 'forEach', 'keys', 'values', Symbol.iterator]) {
  ReactiveType$1.prototype[property] = function (...args) {
    registerDependency({
      target: this
    });
    return type$2.prototype[property].apply(this, args);
  };
}

var map = (map => new ReactiveType$1(map));

var map$1 = /*#__PURE__*/Object.freeze({
  type: type$2,
  getProperty: getProperty,
  ReactiveType: ReactiveType$1,
  default: map
});

const type$3 = Set;
const getProperty$1 = (reactiveSet, prop) => reactiveSet.has(prop);
const ReactiveType$2 = class ReactiveSet extends Set {
  constructor(iterator) {
    super();
    setReactivity({
      target: this,
      original: iterator,
      object: this
    });
    if (iterator) for (const val of iterator) this.add(val);
  }

  get size() {
    registerDependency({
      target: this
    });
    return super.size;
  }

  add(val) {
    const value = reactify(val);

    try {
      return super.add(value);
    } finally {
      notify({
        target: this,
        property: value,
        value
      });
    }
  }

  delete(val) {
    const value = reactify(val);

    try {
      return super.delete(value);
    } finally {
      var _properties$get;

      notify({
        target: this,
        property: value,
        value
      });
      const {
        properties
      } = this[reactivity];
      if (!((_properties$get = properties.get(value)) === null || _properties$get === void 0 ? void 0 : _properties$get.watchers.length)) properties.delete(value);
    }
  }

  clear() {
    try {
      return super.clear();
    } finally {
      notify({
        target: this
      });
      const {
        properties
      } = this[reactivity];

      for (const value of this) {
        var _properties$get2;

        if (!((_properties$get2 = properties.get(value)) === null || _properties$get2 === void 0 ? void 0 : _properties$get2.watchers.length)) properties.delete(value);
      }

      for (const [key] of properties) {
        var _properties$get3;

        if (!((_properties$get3 = properties.get(key)) === null || _properties$get3 === void 0 ? void 0 : _properties$get3.watchers.length)) properties.delete(key);
      }
    }
  }

  has(val) {
    const value = reactify(val);
    propertyReactivity(this, value);
    registerDependency({
      target: this,
      property: value,
      value
    });
    return super.has(value);
  }

};

for (const property of ['entries', 'forEach', 'keys', 'values', Symbol.iterator]) {
  ReactiveType$2.prototype[property] = function (...args) {
    registerDependency({
      target: this
    });
    return type$3.prototype[property].apply(this, args);
  };
}

var set$1 = (set => new ReactiveType$2(set));

var set$2 = /*#__PURE__*/Object.freeze({
  type: type$3,
  getProperty: getProperty$1,
  ReactiveType: ReactiveType$2,
  default: set$1
});

var unreactive = [RegExp, URL, Promise, window.Node, window.Location].map(type => ({
  type,
  default: obj => setReactivity({
    target: obj,
    unreactive: true
  })
}));

const builtIn = [map$1, set$2, // promise,
...unreactive];
const isBuiltIn = reactiveObject => {
  var _builtIn$find;

  return (_builtIn$find = builtIn.find(({
    type: type$$1
  }) => reactiveObject instanceof type$$1)) === null || _builtIn$find === void 0 ? void 0 : _builtIn$find.type;
}; // Has to be from most specific(e.g: Map) to less specific(Object)

var types = new Map([...builtIn, array$1, object$1].map(({
  type: type$$1,
  default: reactify
}) => [type$$1, reactify]));
const propertyGetters = new Map([...builtIn, array$1, object$1].map(({
  type: type$$1,
  getProperty: getProperty$$1
}) => [type$$1, getProperty$$1]));
const getProperty$2 = (reactiveObject, property, _isBuiltIn = isBuiltIn(reactiveObject)) => propertyGetters.has(_isBuiltIn) ? propertyGetters.get(_isBuiltIn)(reactiveObject, property) : reactiveObject[property];

const reactivity = Symbol.for('OzReactivity');
const reactivityProperties = ['$watch', '$watchDependencies', reactivity];
let rootWatchers = [];
let rootObjects = new WeakMap();
const getReactivityRoot = _ => ({
  rootWatchers,
  rootObjects
});
const setReactivityRoot = ({
  watchers: w,
  objects: o
}) => (rootWatchers = w) && (rootObjects = o);

const isGenerator = val => (val === null || val === void 0 ? void 0 : val[Symbol.toStringTag]) === 'AsyncGeneratorFunction';

const callWatcher = (watcher, deep, obj) => deep ? watcher.deep ? watcher(obj, true) : undefined : watcher(obj, false);

const notify = ({
  target,
  property,
  value,
  deep
}) => {
  const react = target[reactivity]; // eslint-disable-line no-use-before-define

  if (!react) return;

  const callWatchers = watchers => {
    const currentWatcher = rootWatchers[rootWatchers.length - 1];
    if (watchers.includes(currentWatcher)) watchers.splice(watchers.indexOf(currentWatcher), 1);
    const cacheWatchers = watchers.filter(({
      cache
    }) => cache);
    /* .filter(({_target, _property}) => (target === _target && property === _property)) */

    cacheWatchers.forEach(({
      propertyReactivity
    }) => delete propertyReactivity.cache);
    cacheWatchers.forEach(watcher => callWatcher(watcher, deep, {
      target,
      property,
      value
    }));
    watchers.filter(({
      cache
    }) => !cache).forEach(watcher => callWatcher(watcher, deep, {
      target,
      property,
      value
    }));
  };

  if (property) {
    const watchers = propertyReactivity(target, property).watchers;

    const _watchers = watchers.slice();

    watchers.length = 0;
    callWatchers(_watchers);
  }

  const watchers = react.watchers;

  const _watchers = watchers.slice();

  watchers.length = 0;
  callWatchers(_watchers);
};

const makeReactivityWatcherArray = (target, property, dependencyListeners) => new Proxy([], {
  defineProperty(_target, _property, desc, {
    value
  } = desc
  /* desc */
  ) {
    const oldValue = _target[_property];

    try {
      return Reflect.defineProperty(_target, _property, desc);
    } finally {
      if (_property === 'length' && oldValue !== value) {
        // console.log(oldValue, value, oldValue !== value)
        for (const watcher of dependencyListeners) watcher(target, property, value);
      }
    }
  }

});

const makeReactivityObject = (object, dependencyListeners = []) => ({
  dependencyListeners,
  watchers: makeReactivityWatcherArray(object, undefined, dependencyListeners),
  properties: new Map(),
  // new ReactivePropertyMap(dependencyListeners, object),
  object
});

const setReactivity = ({
  target,
  unreactive,
  original,
  object
}) => {
  if (unreactive) {
    target[reactivity] = false;
    return target;
  }

  if (original) rootObjects.set(original, target);
  const reactivityObject = makeReactivityObject(object);
  Object.defineProperty(target, reactivity, {
    value: reactivityObject,
    configurable: true,
    writable: true
  });
  Object.defineProperty(target, '$watch', {
    value: watch(target),
    configurable: true,
    writable: true
  });
  Object.defineProperty(target, '$watchDependencies', {
    value: listener => {
      reactivityObject.dependencyListeners.push(listener);
      return _ => reactivityObject.dependencyListeners.splice(reactivityObject.dependencyListeners.indexOf(listener - 1), 1);
    },
    configurable: true,
    writable: true
  });
  return target;
};
const registerWatcher = (getter, watcher) => {
  rootWatchers.push(watcher);

  try {
    return getter();
  } finally {
    rootWatchers.pop();
  }
};
const propertyReactivity = (target, property) => {
  const {
    properties,
    dependencyListeners
  } = target[reactivity];
  if (properties.has(property)) return properties.get(property);
  const propertyReactivity = {
    watchers: makeReactivityWatcherArray(target, property, dependencyListeners) // cache: undefined

  };
  properties.set(property, propertyReactivity);
  return propertyReactivity;
};
const pushWatcher = (object, watcher) => {
  if (object && typeof object === 'object' && object[reactivity] && !object[reactivity].watchers.includes(watcher)) {
    var _watcher$dependencies;

    object[reactivity].watchers.push(watcher);
    (_watcher$dependencies = watcher.dependenciesWatchers) === null || _watcher$dependencies === void 0 ? void 0 : _watcher$dependencies.push(object[reactivity].watchers);
  }
};
const includeWatcher = (arr, watcher) => arr.includes(watcher) || arr.some(_watcher => watcher.object && watcher.property && watcher.object === _watcher.object && watcher.property === _watcher.property);

const pushCurrentWatcher = ({
  watchers
}) => {
  const currentWatcher = rootWatchers[rootWatchers.length - 1];

  if (currentWatcher && !includeWatcher(watchers, currentWatcher)) {
    var _currentWatcher$depen;

    (_currentWatcher$depen = currentWatcher.dependenciesWatchers) === null || _currentWatcher$depen === void 0 ? void 0 : _currentWatcher$depen.push(watchers);
    watchers.push(currentWatcher);
  }
};

const registerDependency = ({
  target,
  property
}) => {
  if (!rootWatchers.length || !target[reactivity]) return;
  if (property) pushCurrentWatcher(propertyReactivity(target, property));else pushCurrentWatcher(target[reactivity]);
};
const watch = target => (getter, handler) => {
  const options = {
    dependenciesWatchers: [],
    autoRun: true,
    returnAtChange: true
  };
  if (target && typeof handler === 'object') Object.defineProperties(options, Object.getOwnPropertyDescriptors(handler));

  if (target) {
    if (!handler || typeof handler !== 'function') {
      handler = getter;
      getter = undefined;
    }

    const type = typeof getter;

    if (type === 'string' || type === 'number' || type === 'symbol') {
      const property = getter;

      getter = _ => getProperty$2(target, property);
    }
  }

  const isGetterGenerator = isGenerator(getter);
  let unregister, oldValue;

  const watcher = (event, deep) => {
    options.dependenciesWatchers.length = 0; // Empty the dependenciesWatchers array

    if (unregister) return; // Return without registering the watcher

    if (getter) {
      // If there's a getter function
      if (isGetterGenerator) {
        var _oldValue;

        if (options.returnAtChange) (_oldValue = oldValue) === null || _oldValue === void 0 ? void 0 : _oldValue.return();
        const iterator = getter();

        const _next = iterator.next.bind(iterator);

        let previousValue;

        iterator.next = (...args) => {
          let resolve, reject;
          const promise = new Promise((_resolve, _reject) => (resolve = _resolve) && (reject = _reject));
          promise.finally(_ => rootWatchers.pop());
          if (!previousValue) rootWatchers.push(watcher);

          const value = _next(args.length ? args[0] : previousValue);

          if (!previousValue) rootWatchers.pop();
          value.finally(_ => rootWatchers.push(watcher));
          value.then(resolve).catch(reject);
          previousValue = value;
          return value;
        };

        if (options.autoRun) {
          const autoRun = promise => promise && promise.then(({
            done
          }) => !done && autoRun(iterator.next()));

          autoRun(iterator.next());
        }

        if (handler) handler({
          newValue,
          oldValue,
          event,
          deep
        });
        oldValue = iterator;
      } else {
        let newValue = registerWatcher(getter, watcher); // pushWatcher(newValue, watcher)

        if (handler) handler({
          newValue,
          oldValue,
          event,
          deep
        });
        oldValue = newValue;
      }
    } else {
      handler({
        newValue: target,
        oldValue: target,
        event,
        deep
      });
      pushWatcher(target, watcher);
    }
  };

  if (options) Object.defineProperties(watcher, Object.getOwnPropertyDescriptors(options));
  watcher.dependenciesWatchers = options.dependenciesWatchers;

  if (getter) {
    if (isGetterGenerator) watcher();else oldValue = registerWatcher(getter.bind(target, target), watcher);
  }

  pushWatcher(getter ? oldValue : target, watcher);
  return {
    value: oldValue,
    unregister: _ => {
      for (const watchers of options.dependenciesWatchers) watchers.splice(watchers.indexOf(watcher) - 1, 1);

      unregister = true;
    },
    abort: undefined
  };
};

const reactify = obj => {
  if (!obj || typeof obj !== 'object' || reactivity in obj) return obj;
  if (rootObjects.has(obj)) return rootObjects.get(obj);
  return Array.from(types).find(([type]) => obj instanceof type)[1](obj);
};

const watch$1 = watch();

const getDependentsPlaceholders = ({
  template,
  placeholdersMetadata,
  ids,
  self
}) => placeholdersMetadata.filter(placeholderMetadata => placeholderMetadata.ids.some(id => ids.includes(id))).map(placeholderMetadata => template.placeholders.find(({
  metadata
}) => metadata === placeholderMetadata)).filter(placeholder$$1 => placeholder$$1 !== self);

const eventRegexes = [/^@/, /^on-/];

const removeEventListeners = (element, event, listeners) => listeners.forEach(listener => element.removeEventListener(event, listener));

const makeElement = ({
  template,
  template: {
    placeholdersMetadata
  },
  placeholderMetadata,
  placeholderMetadata: {
    type,
    ids,
    values: [_tagName],
    tagName = _tagName ? toPlaceholderString(_tagName) : undefined,
    values: [__attributeName, _doubleQuoteValue, _singleQuoteValue, unquotedValue],
    toAttributeName = __attributeName ? toPlaceholderString(__attributeName) : undefined,
    toDoubleQuoteValue = _doubleQuoteValue ? toPlaceholderString(_doubleQuoteValue) : undefined,
    toSingleQuoteValue = _singleQuoteValue ? toPlaceholderString(_singleQuoteValue) : undefined
  },
  arrayFragment,
  dependents,
  _attributeName = toAttributeName(template.values),
  _value,
  _eventName,
  _eventListeners,
  _ref
}) => {
  for (const id of ids) arrayFragment[0].removeAttribute(placeholder(id));

  const self = ({
    values,
    forceUpdate,
    element = arrayFragment[0],
    references = template.references,
    value = values[ids[0]]
  }) => {
    if (_ref && !(!_doubleQuoteValue && !_singleQuoteValue && !unquotedValue && (value === null || value === void 0 ? void 0 : value[OzHTMLReference]))) {
      if (references.has(_ref[OzHTMLReference])) references.delete(_ref[OzHTMLReference]);
      _ref = undefined;
    }

    if (!dependents) dependents = getDependentsPlaceholders({
      template,
      placeholdersMetadata,
      ids,
      self
    });

    if (type === 'startTag') {
      const newElement = document.createElement(tagName(values));

      for (const placeholder$$1 of dependents) placeholder$$1({
        values,
        forceUpdate: true
      });

      replace(arrayFragment, newElement);
    } else if (type === 'attribute') {
      if (!_doubleQuoteValue && !_singleQuoteValue && !unquotedValue && (value === null || value === void 0 ? void 0 : value[OzHTMLReference])) {
        if (references.get(value[OzHTMLReference]) !== element) references.set(value[OzHTMLReference], element);
        _ref = value;
      } else {
        const attributeName = toAttributeName(values);

        if (unquotedValue) {
          const placeholdersNumber = toPlaceholdersNumber(unquotedValue);
          const eventTest = eventRegexes.find(regex => attributeName.match(regex));

          if (eventTest) {
            if (!_eventListeners) _eventListeners = [];
            const listeners = placeholdersNumber.map(n => values[n]).filter(v => typeof v === 'function');
            const newListeners = listeners.filter(listener => !_eventListeners.includes(listener));
            const eventName = attributeName.replace(eventTest, '');
            removeEventListeners(element, _eventName, _eventListeners.filter(listener => !listeners.includes(listener)));

            for (const listener of newListeners) element.addEventListener(eventName, listener);

            _eventName = eventName;
            _eventListeners = listeners;
          } else {
            if (_eventListeners) removeEventListeners(element, _attributeName, _eventListeners);
            _eventListeners = undefined;
            element[attributeName] = values[placeholdersNumber[0]];
          }
        } else {
          if (attributeName !== _attributeName && element.hasAttribute(_attributeName)) element.removeAttribute(_attributeName);

          const value = (toDoubleQuoteValue || toSingleQuoteValue || (_ => undefined))(values);

          if (attributeName) element.setAttribute(attributeName, value.trim() || '');
          _value = value;
        }

        _attributeName = attributeName;
      }
    }
  };

  return self;
};

const OzHTMLTemplate = Symbol.for('OzHTMLTemplate');

const makeText = ({
  template,
  placeholderMetadata,
  arrayFragment,
  _value,
  _template,
  _placeholders,
  _fragments
}) => ({
  values,
  value = values[placeholderMetadata.ids[0]],
  forceUpdate
}) => {
  const type = typeof value;

  if (value && type === 'object') {
    if (value instanceof Promise) {
      replace(arrayFragment, new Text());
      value.then(resolvedValue => _value === value ? template.update(...template.values.map((_, i) => i === placeholderMetadata.ids[0] ? resolvedValue : _)) : undefined);
    } else if (value && value[OzHTMLTemplate]) {
      var _template2;

      if (value.templateId === ((_template2 = _template) === null || _template2 === void 0 ? void 0 : _template2.templateId)) {
        _template.update(...value.values);

        replace(arrayFragment, _template.childNodes);
      } else replace(arrayFragment, value.childNodes);

      _template = value;
    } else if (Array.isArray(value)) {
      const values = value;
      const [placeholders, fragments] = values.reduce(tuple => (tuple[0].push(makeText({
        template,
        placeholderMetadata,
        arrayFragment: tuple[1][tuple[1].push([]) - 1]
      })), tuple), [[], []]);
      placeholders.forEach((placeholder$$1, i) => placeholder$$1({
        value: value[i]
      }));
      replace(arrayFragment, fragments);
      _placeholders = placeholders;
      _fragments = fragments;
    } else if (value instanceof Node) {
      replace(arrayFragment, value);
    }
  } else if (type === 'function') {
    if (value.prototype instanceof Node) {
      const Constructor = value;
      if (arrayFragment[0] instanceof Constructor) replace(arrayFragment, arrayFragment[0]);else replace(arrayFragment, new Constructor());
    } else {
      makeText({
        template,
        placeholderMetadata,
        arrayFragment
      })({
        value: value(arrayFragment)
      });
    }
  } else {
    const textNode = arrayFragment[0];

    if ((textNode === null || textNode === void 0 ? void 0 : textNode.nodeType) === Node.TEXT_NODE) {
      replace(arrayFragment, textNode);
      const newValue = value === undefined ? '' : type === 'symbol' ? value.toString() : '' + value;
      if (textNode.data !== newValue) textNode.data = newValue;
    } else {
      replace(arrayFragment, new Text(type === 'symbol' ? value.toString() : value));
    }
  }

  if (!arrayFragment.flat(Infinity).length) replace(arrayFragment, new Comment());
  _value = value;
};

const OzHTMLReference = Symbol.for('OzHTMLReference');
const replaceNodes = (oldNodes, newNodes) => {
  for (const i in newNodes) {
    // `oldNode` can be undefined if the number of
    // new nodes is larger than the number of old nodes
    const oldNode = oldNodes[i];
    const newNode = newNodes[i];

    if (oldNode !== newNode) {
      if (oldNode) {
        oldNode.parentNode.insertBefore(newNode, oldNode);
        if (newNodes[i + 1] !== oldNode) oldNode.remove();
      } else {
        // Will place the new node after the previous newly placed new node
        const previousNewNode = newNodes[i - 1];
        const {
          parentNode
        } = previousNewNode;
        parentNode.insertBefore(newNode, previousNewNode.nextSibling);
        if (oldNode) oldNode.remove();
      }
    }
  }

  for (const node of oldNodes.filter(node => !newNodes.includes(node))) node.remove();
};
const getNodePath = (node, path = [], {
  parentNode: parent
} = node) => parent ? getNodePath(parent, path.concat(Array.from(parent.childNodes).indexOf(node))) : path.reverse();
const walkPlaceholders = ({
  html,
  element: element$$1,
  text: text$$1,
  comment: comment$$1
}) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  const walker = document.createTreeWalker(template.content, (element$$1 ? NodeFilter.SHOW_ELEMENT : 0) + (comment$$1 ? NodeFilter.SHOW_COMMENT : 0) + (text$$1 ? NodeFilter.SHOW_TEXT : 0), {
    acceptNode: ({
      nodeType,
      outerHTML,
      innerHTML,
      data
    }) => nodeType === Node.ELEMENT_NODE ? outerHTML.replace(innerHTML, '').match(placeholderRegex) ? NodeFilter.FILTER_ACCEPT : innerHTML.match(placeholderRegex) ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_REJECT : (nodeType === Node.TEXT_NODE || nodeType === Node.COMMENT_NODE) && data.match(placeholderRegex) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });

  while (walker.nextNode()) {
    const {
      currentNode,
      currentNode: {
        nodeType
      }
    } = walker;
    if (nodeType === Node.ELEMENT_NODE) element$$1(currentNode);else if (nodeType === Node.TEXT_NODE) text$$1(currentNode);else if (nodeType === Node.COMMENT_NODE) comment$$1(currentNode);
  }

  return template.content;
};
const placeholdersMetadataToPlaceholders = ({
  template,
  placeholdersMetadata,
  fragment
}) => {
  const childNodes = Array.from(fragment.childNodes);
  const placeholders = [];

  for (const i in placeholdersMetadata) {
    const placeholderMetadata = placeholdersMetadata[i];
    const {
      type,
      path,
      ids
    } = placeholderMetadata;
    if (type === 'endTag') continue;
    const node = type === 'startTag' || type === 'attribute' ? fragment.querySelector(`[${placeholder(ids[0])}]`) : path.reduce((node, nodeIndex) => node.childNodes[nodeIndex], fragment);
    const arrayFragment = [node];
    if (childNodes.includes(node)) childNodes.splice(childNodes.indexOf(node), 1, arrayFragment);
    let placeholder$$1 = (type === 'text' ? makeText : type === 'comment' ? makeComment : makeElement
    /* type === 'startTag' || type === 'attribute' */
    )({
      template,
      placeholderMetadata,
      arrayFragment
    });
    placeholder$$1.metadata = placeholderMetadata;
    placeholder$$1.arrayFragment = arrayFragment;
    placeholders.push(placeholder$$1);
  }

  return {
    childNodes,
    placeholders
  };
};

const attribute = /^\s*([^\s"'<>/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const ncname = '[a-zA-Z_-][-\\w\\-\\.]*';
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/(${qnameCapture}[^>]*)>`);
const textRegex = new RegExp(`([${placeholderMinRangeChar}-${placeholderMaxRangeChar}])|([^${placeholderMinRangeChar}-${placeholderMaxRangeChar}]*)`, 'umg');

const getCharacterDataNodePath = placeholders => node => {
  const match = node.data.match(new RegExp(placeholderRegex, 'um'));

  if (match) {
    const isTextNode = node.nodeType === Node.TEXT_NODE;
    const placeholderNode = isTextNode ? node.splitText(match.index) : node;

    if (isTextNode) {
      placeholderNode.data = placeholderNode.data.substring(match[0].length);
      if (placeholderNode.data.length) placeholderNode.splitText(0);
    }

    placeholders[charToN(match[0])].path = getNodePath(placeholderNode);
  }
};

var parse = (({
  transform,
  strings,
  values
}) => {
  let source = transform(strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2));
  let html = '';
  const placeholders = [];

  const advance = (n, type, ...vals) => {
    let replacement = '';
    let placeholder$$1;

    if (type) {
      placeholder$$1 = {
        type,
        ids: vals.filter(_ => _).map(val => (val.match(placeholderRegex) || []).map(char => charToN(char))).flat(Infinity),
        values: vals,
        path: []
      };
      let {
        ids
      } = placeholder$$1;

      if (ids.length) {
        ids.forEach(_ => placeholders.push(placeholder$$1));

        if (type === 'startTag' || type === 'endTag') {
          replacement = toPlaceholderString(vals[0])(values) + (type === 'startTag' ? ` ${placeholder(ids[0])}` : '');
        } else if (type === 'attribute' || type === 'comment') {
          replacement = `${type === 'attribute' ? ' ' : ''}${placeholder(ids[0])}`;
        }
      }
    }

    html += replacement || source.substr(0, n);
    source = source.substring(n);
    return placeholder$$1;
  };

  while (source) {
    // eslint-disable-line no-unmodified-loop-condition
    const textEnd = source.indexOf('<');

    if (textEnd === 0) {
      if (source.startsWith('<!--')) {
        // Comment
        const commentEnd = source.indexOf('-->');

        if (commentEnd === -1) {
          advance(4);
          advance(source.length - 1, 'comment', source);
          continue;
        }

        advance(4);
        advance(commentEnd - 4, 'comment', source.substr(0, commentEnd - 4));
        advance(3);
        continue;
      }

      const endTagMatch = source.match(endTag);

      if (endTagMatch) {
        // End tag
        advance(endTagMatch[0].length, 'endTag', source.substr(0, endTagMatch[0].length));
        continue;
      }

      const startTagMatch = source.match(startTagOpen);

      if (startTagMatch) {
        // Start tag
        advance(1);
        const placeholder$$1 = advance(startTagMatch[1].length, 'startTag', startTagMatch[1]);
        let attributes = [];
        let end, attr;

        while (!(end = source.match(startTagClose)) && (attr = source.match(attribute))) {
          const attrPlaceholder = advance(attr[0].length, 'attribute', attr[1], attr[3], attr[4], attr[5]);
          attrPlaceholder.dependents = attributes;
          attributes.push(attrPlaceholder);
        }

        attributes = attributes.filter(item => item);
        placeholder$$1.dependents = attributes;

        if (end) {
          advance(end[0].length);
          continue;
        }
      }
    }

    for (const str of source.substring(0, textEnd !== -1 ? textEnd : textEnd.length).match(textRegex)) advance(str.length, 'text', str);
  }

  return {
    fragment: walkPlaceholders({
      html,
      text: getCharacterDataNodePath(placeholders),
      comment: getCharacterDataNodePath(placeholders)
    }),
    placeholdersMetadata: placeholders
  };
});

class OzHTMLTemplate$1 extends HTMLTemplateElement {
  constructor({
    templateId,
    originalFragment,
    values,
    placeholdersMetadata,
    references
  }) {
    super();
    this.references = references || reactify(new Map());
    this.templateId = templateId;
    this.values = values;
    this.placeholdersMetadata = placeholdersMetadata;
    this.originalFragment = originalFragment;
    this.setAttribute('is', 'oz-html-template');
  }

  get [OzHTMLTemplate]() {
    return true;
  }

  init(isUpdate) {
    if (this.placeholders) return;
    const fragment = document.importNode(this.originalFragment, true);
    const {
      placeholders,
      childNodes
    } = placeholdersMetadataToPlaceholders({
      template: this,
      placeholdersMetadata: this.placeholdersMetadata,
      fragment
    });
    this.placeholders = placeholders;
    this.content.appendChild(fragment);
    this._childNodes = childNodes;
    if (isUpdate) this.forceUpdate = true;else this.update(...this.values);
  }

  clone(values = this.values) {
    return new OzHTMLTemplate$1({
      originalFragment: this.originalFragment,
      values,
      placeholdersMetadata: this.placeholdersMetadata,
      templateId: this.templateId
    });
  }

  update(...values) {
    this.init(true);

    for (const value of values) {
      if (value === null || value === void 0 ? void 0 : value[OzHTMLTemplate]) value.references = this.references;
    }

    const oldArrayFragments = this.placeholders.map(({
      arrayFragment
    }) => arrayFragment.flat(Infinity));
    const referencesPlaceholders = this.placeholders.filter(placeholder => placeholder.metadata.ids.length === 1).filter(({
      metadata: {
        values
      }
    }) => !values[1] && !values[2] && !values[3]).filter(placeholder => {
      var _values$placeholder$m;

      return (_values$placeholder$m = values[placeholder.metadata.ids[0]]) === null || _values$placeholder$m === void 0 ? void 0 : _values$placeholder$m[OzHTMLReference];
    });
    const otherPlaceholders = this.placeholders.filter(placeholder => !referencesPlaceholders.includes(placeholder));

    for (const placeholder of referencesPlaceholders) placeholder({
      values,
      forceUpdate: this.forceUpdate
    });

    for (const placeholder of otherPlaceholders) placeholder({
      values,
      forceUpdate: this.forceUpdate
    });

    const newArrayFragments = this.placeholders.map(({
      arrayFragment
    }) => arrayFragment.flat(Infinity));

    for (const i in this.placeholders) replaceNodes(oldArrayFragments[i], newArrayFragments[i]);

    this.values = values;
    this.forceUpdate = false;
  }

  get childNodes() {
    this.init();
    return this._childNodes;
  }

  get content() {
    this.init();
    return super.content;
  }

  connectedCallback() {
    this.insertAfter();
  }

  insertNodesAfter() {
    this.init();

    for (const node of this.childNodes.flat(Infinity)) this.parentNode.insertBefore(node, this.nextSibling);
  }

  insertNodesToFragment() {
    this.init();

    for (const node of this.childNodes.flat(Infinity)) this.content.appendChild(node);
  }

  insertAfter() {
    this.init();
    this.parentNode.insertBefore(this.content, this.nextSibling);
  }

  disconnectedCallback() {
    this.insertNodesToFragment();
  }

}

customElements.get('oz-html-template') || customElements.define('oz-html-template', OzHTMLTemplate$1, {
  extends: 'template'
});
var createTemplate = (options => new OzHTMLTemplate$1(options));

const elements = new Map();
const HTMLTag = (transform = str => str) => {
  const tag = (strings, ...values) => {
    const templateId = 'html' + strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2);
    if (elements.has(templateId)) return elements.get(templateId).clone(values);
    const {
      fragment,
      placeholdersMetadata
    } = parse({
      transform,
      strings,
      values
    });
    elements.set(templateId, createTemplate({
      templateId,
      originalFragment: fragment,
      values,
      placeholdersMetadata
    }));
    return elements.get(templateId).clone(values);
  };

  tag.ref = val => ({
    [OzHTMLReference]: val
  });

  return tag;
};
const html = HTMLTag();

const globalRemovedIds = [];
const globalIds = [];

const makeUniqueId = (n = globalRemovedIds.length ? globalRemovedIds.shift() : globalIds[globalIds.length - 1] === undefined ? 0 : globalIds.length) => {
  globalIds.splice(n, 0, n);
  return {
    id: n,
    match: undefined,
    strId: undefined,
    strAttrId: undefined,
    originalSelector: undefined,
    selector: undefined,
    nodeSelector: undefined,
    nodes: new Map(),
    unregister: _ => {
      globalRemovedIds.push(n);
      globalIds.splice(globalIds.indexOf(n), 1);
    }
  };
};

const watchedElements = new Map();
let measuringElement = document.createElement('div');
measuringElement.style.display = 'none';

const updateElement = (target, contentRect = target.getClientRects()) => {
  const containerQueries = watchedElements.get(target);
  target.parentNode.insertBefore(measuringElement, target);

  for (const containerQuery$$1 of containerQueries) {
    measuringElement.style.height = containerQuery$$1.match[3];
    const containerQueryPxValue = parseInt(window.getComputedStyle(measuringElement).height);
    const property = containerQuery$$1.match[2].endsWith('height') ? 'height' : containerQuery$$1.match[2].endsWith('width') ? 'width' : undefined;

    if (containerQuery$$1.match[2].startsWith('min') && contentRect[property] > containerQueryPxValue || containerQuery$$1.match[2].startsWith('max') && contentRect[property] < containerQueryPxValue) {
      target.setAttribute(containerQuery$$1.strId, '');
    } else {
      target.removeAttribute(containerQuery$$1.strId);
    }
  }

  measuringElement.remove();
  measuringElement.style.height = '';
};

const observed = new Map();
let resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(entries => {
  for (let _ref of entries) {
    let {
      target,
      contentRect
    } = _ref;
    updateElement(target, contentRect);
  }
}) : {
  observe: elem => observed.set(elem, elem.getClientRects()),
  unobserve: elem => observed.delete(elem)
};

if (!('ResizeObserver' in window)) {
  const test = _ => {
    for (const [entry, {
      height: _height,
      width: _width
    }] of watchedElements) {
      const bounds = entry.getClientRects();
      const {
        height,
        width
      } = bounds;

      if (height !== _height || width !== _width) {
        updateElement(entry, bounds);
        observed.set(entry, bounds);
      }
    }

    window.requestAnimationFrame(test);
  };

  window.requestAnimationFrame(test);
}

const watchElement = (elem, containerQuery$$1) => {
  const _containerQueries = watchedElements.get(elem);

  const containerQueries = _containerQueries || [];
  containerQueries.push(containerQuery$$1);
  if (!_containerQueries) watchedElements.set(elem, containerQueries);
  resizeObserver.observe(elem);
  return _ => {
    containerQueries.splice(containerQueries.indexOf(containerQuery$$1), 1);
    if (!containerQueries.length) watchedElements.delete(elem);
    resizeObserver.unobserve(elem);

    for (const [node] of containerQuery$$1.nodes) node.removeAttribute(containerQuery$$1.strId);
  };
};

var makeStyle = (({
  placeholderMetadata,
  placeholderMetadata: {
    values: [_selector],
    rule: _rule
  },
  rules: [rule],
  placeholderIds = toPlaceholdersNumber(_selector)
}) => {
  const {
    ownerDocument
  } = rule.parentStyleSheet.ownerNode;
  const getResult = toPlaceholderString(placeholderMetadata.values[0]);

  let _containerQueries;

  const matchContainerQueriesNodes = _ => {
    for (const containerQuery$$1 of _containerQueries) {
      const matchedNodes = Array.from(ownerDocument.querySelectorAll(containerQuery$$1.nodeSelector));
      const containerQueryNodes = Array.from(containerQuery$$1.nodes.keys());
      containerQueryNodes.filter(node => !matchedNodes.includes(node)) // Removed nodes
      .forEach(node => {
        containerQuery$$1.nodes.get(node)(); // Unregister watcher

        containerQuery$$1.nodes.delete(node);
      });
      matchedNodes.filter(node => !containerQueryNodes.includes(node)) // Added nodes
      .forEach(node => containerQuery$$1.nodes.set(node, watchElement(node, containerQuery$$1)
      /* Register watcher */
      ));
    }
  };

  const mutationObserver = new MutationObserver(matchContainerQueriesNodes);
  return [({
    values,
    forceUpdate,
    scope
  }) => {
    // Update
    const result = getResult(values);

    if (containerQueryRegex.test(result)) {
      mutationObserver.observe(ownerDocument, {
        subtree: true,
        childList: true,
        attributes: true
      });

      if (_containerQueries) {
        for (const containerQuery$$1 of _containerQueries) {
          containerQuery$$1.unregister();
        }

        _containerQueries = undefined;
      }

      const containerQueries = matchSelectorRulesets(result).filter(str => containerQueryRegex.test(str)).map((str, i) => {
        let containerQueries = [];
        let match;

        while (match = globalContainerQueryRegex.exec(str)) {
          const uniqueId = makeUniqueId();
          uniqueId.match = match;
          uniqueId.strId = containerQuery(uniqueId.id);
          uniqueId.strAttrId = containerQueryAttribute(uniqueId.id);
          containerQueries.push(uniqueId);
        }

        const selector = containerQueries.reduce((str, {
          strAttrId,
          match
        }) => str.replace(match[0], strAttrId), result);

        for (const containerQuery$$1 of containerQueries) {
          containerQuery$$1.originalSelector = str;
          containerQuery$$1.selector = selector;
          containerQuery$$1.nodeSelector = selector.slice(0, selector.indexOf(containerQuery$$1.strAttrId)).replace(globalContainerQueryAttributeRegex, '');
        }

        return containerQueries;
      }).flat(Infinity);
      const selector = containerQueries.reduce((str, {
        originalSelector,
        selector
      }) => str.replace(originalSelector, selector), result);
      rule.selectorText = selector.replace(/:scope/g, scope !== '' ? `[data-oz-scope="${scope}"]` : '') || '-oz-no-scope';
      _containerQueries = containerQueries;
      matchContainerQueriesNodes();
    } else {

      if (_containerQueries) {
        for (const containerQuery$$1 of _containerQueries) {
          containerQuery$$1.unregister();
        }

        _containerQueries = undefined;
      }

      rule.selectorText = result.replace(/:scope/g, scope !== '' ? `[data-oz-scope="${scope}"]` : '') || '-oz-no-scope';
    }
  }, _ => {
  }];
});

var makeStyleProperty = (({
  placeholderMetadata: {
    values,
    path
  },
  rules: [style],
  getNameResult = toPlaceholderString(values[0]),
  getValueResult = toPlaceholderString(values[1]),
  _name = `--${path[path.length - 1]}`
}) => ({
  values
}) => {
  style.removeProperty(_name);
  style.setProperty(_name = getNameResult(values), getValueResult(values));
});

const OzStyle = Symbol.for('OzStyle');

const makeStylesheet = ({
  placeholderMetadata: {
    rule: ast,
    ids
  },
  rules,
  getIndexOf = rule => Array.from(rules[0].parentStyleSheet.cssRules).indexOf(rule),
  getFirstIndex = _ => getIndexOf(rules[0]),
  getLastIndex = _ => getIndexOf(rules[rules.length - 1]),
  _style
}) => ({
  values,
  value = values[ids[0]],
  forceUpdate,
  scope
}) => {
  if (value && typeof value === 'object' && OzStyle in value) {
    value.scope = scope;

    if (_style && typeof _style === 'object' && OzStyle in _style && _style.templateId === value.templateId && _style.values.some((val, i) => val !== value[i])) {
      _style.update(...value.values);

      replace(rules, ..._style.childRules);
    } else {
      _style = value;
      replace(rules, ...value.connectedCallback([ast], rules));
    }
  }
};

const containerQueryRegex = /:element\(((.*?)=(.*?))\)/;
const globalContainerQueryRegex = new RegExp(containerQueryRegex, 'g');
const containerQuery = i => `oz-container-query-${i}`;
const containerQueryAttribute = i => `[oz-container-query-${i}]`;
const containerQueryAttributeRegex = /\[oz-container-query-(\d)\]/;
const globalContainerQueryAttributeRegex = new RegExp(containerQueryAttributeRegex, 'g'); // todo @banou26 rework the style templates to get rid of the CSSOM AST and only update the CSSOM based on the root stylesheet & the parser ASTRules

const replaceRules = (oldASTRules, oldRules, newASTRules, newRules = []) => {
  const stylesheet$$1 = oldRules[0].parentStyleSheet;
  const stylesheetCssRules = stylesheet$$1.cssRules;

  for (const i in newASTRules) {
    const oldASTRule = oldASTRules[i];
    const newASTRule = newASTRules[i];

    if (oldASTRule !== newASTRule) {
      const rulesArray = Array.from(stylesheetCssRules);
      const oldRule = oldRules[i];
      const oldRuleIndex = rulesArray.indexOf(oldRule);

      if (oldRule) {
        newRules.push(stylesheet$$1.cssRules[stylesheet$$1.insertRule(newASTRule.string, oldRuleIndex)]);
        if (newASTRules[i + 1] !== oldASTRule) stylesheet$$1.deleteRule(oldRuleIndex + 1);
      } else {
        // Will place the new node after the previous newly placed new node
        const previousNewRule = newRules[i - 1];
        const previousNewRuleIndex = rulesArray.indexOf(previousNewRule);
        newRules.push(stylesheet$$1.cssRules[stylesheet$$1.insertRule(newASTRule.string, previousNewRuleIndex)]);
        if (oldRule) stylesheet$$1.deleteRule(oldRuleIndex);
      }
    }
  }

  for (const node of oldRules.filter(node => !newRules.includes(node))) {
    const rulesArray = Array.from(stylesheetCssRules);
    if (rulesArray.includes(node)) stylesheet$$1.deleteRule(rulesArray.indexOf(node));
  }

  if (!newRules.length) newRules.push(stylesheet$$1.cssRules[stylesheet$$1.insertRule('@supports (oz-node-placeholder){}', 0)]);
  return newRules;
};
const placeholdersMetadataToPlaceholders$1 = ({
  element,
  element: {
    sheet
  },
  placeholdersMetadata,
  childRules = Array.from(sheet.cssRules)
}) => {
  const placeholders = [];

  for (const i in placeholdersMetadata) {
    const placeholderMetadata = placeholdersMetadata[i];
    const {
      type,
      path
    } = placeholderMetadata;
    if (path[0] === 'cssRules') path.shift();
    const rule = (type === 'declaration' ? path.slice(0, -1) : path).reduce((rule, attrName) => rule[attrName], childRules);
    const rules = [rule];
    if (childRules.includes(rule) && type === 'atRule') childRules.splice(childRules.indexOf(rule), 1, rules);
    let placeholder = (type === 'declaration' ? makeStyleProperty : type === 'ruleset' ? makeStyle : type === 'atRule' ? makeStylesheet : undefined)({
      placeholderMetadata,
      rules
    });
    placeholder.metadata = placeholderMetadata;
    placeholder.rules = rules;
    placeholders.push(placeholder);
  }

  return {
    childRules,
    placeholders
  };
};

const parser = new Parser(new class Factory extends NodeFactory {
  ruleset(_selector, ...args) {
    const selector = !_selector.startsWith('@') && matchSelectorRulesets(_selector).map(ruleset => ruleset.startsWith(':scope') ? ruleset : `:scope ${ruleset}`).join(',');
    return _objectSpread({}, super.ruleset(_selector, ...args), {
      _selector,
      selector
      /*: _selector*/

    }, !_selector.startsWith('@') && {
      type: 'rulesetPlaceholder' // ...(singlePlaceholderRegex.test(_selector) || _selector.includes(':element')) && { type: `rulesetPlaceholder` }

    });
  }

  expression(...args) {
    return _objectSpread({}, super.expression(...args), singlePlaceholderRegex.test(args[0]) && {
      type: `expressionPlaceholder`
    });
  }

  atRule(...args) {
    return _objectSpread({}, super.atRule(...args), args[0] === 'supports' && singlePlaceholderRegex.test(args[1]) && {
      type: 'atRulePlaceholder'
    });
  }

  declaration(...args) {
    return _objectSpread({}, super.declaration(...args), (singlePlaceholderRegex.test(args[0]) || singlePlaceholderRegex.test(args[1].text)) && {
      type: 'declarationPlaceholder'
    });
  }

}());
const stringifier = new class extends Stringifier {
  atRulePlaceholder(...args) {
    return super.atRule(...args);
  }

  rulesetPlaceholder({
    selector,
    rulelist
  }) {
    return `${selector.replace(/:element\((.*?)\)/g, '')}${this.visit(rulelist)}`;
  }

  declarationPlaceholder({
    name,
    value
  }) {
    return `--${name}${value ? `:${this.visit(value)}` : ''}`;
  }

  expressionPlaceholder({
    text
  }) {
    return `${text.replace(placeholderRegex, 'var(--$&)')}${text.endsWith(';') ? '' : ';'}`;
  }

}();

const findPlaceholdersAndPaths = (rule, placeholders = [], _path = [], path = [..._path], {
  type,
  selector,
  name,
  value,
  parameters,
  text = type.startsWith('declaration') ? value.text : undefined
} = rule, vals = [selector || name || value, text || parameters]) => {
  // match, create PlaceholderMetadata and push to placeholders
  if (type && type.endsWith('Placeholder') && type !== 'expressionPlaceholder') {
    placeholders.push({
      type: type.slice(0, -'Placeholder'.length),
      values: vals,
      ids: vals.filter(_ => _).map(val => (val.match(placeholderRegex) || []).map(char => charToN(char))).flat(Infinity),
      path,
      rule
    });
  } // search for placeholders in childs


  if (Array.isArray(rule)) {
    for (const i in rule) findPlaceholdersAndPaths(rule[i], placeholders, [...path, i]);
  } else if (rule.type.startsWith('ruleset')) {
    const rules = rule.rulelist.rules.filter(({
      type
    }) => type === 'declarationPlaceholder');

    for (const i in rules) {
      const rule = rules[i];
      findPlaceholdersAndPaths(rule, placeholders, [...path, 'style', rule.name]);
    }
  } else if (rule.type.startsWith('atRule')) {
    var _rule$rulelist;

    const rules = (_rule$rulelist = rule.rulelist) === null || _rule$rulelist === void 0 ? void 0 : _rule$rulelist.rules;

    for (const i in rules) {
      const rule = rules[i];
      findPlaceholdersAndPaths(rule, placeholders, [...path, 'cssRules', i]);
    }
  } else if (rule.type.startsWith('stylesheet')) {
    const rules = rule.rules;

    for (const i in rules) {
      const rule = rules[i];
      findPlaceholdersAndPaths(rule, placeholders, [...path, 'cssRules', i]);
    }
  }

  return placeholders;
};

var parse$1 = (({
  transform,
  strings,
  values
}, ast = parser.parse(transform(strings.reduce((str, str2, i) => `${str}${typeof values[i - 1] === 'object' ? `@supports (${placeholder(i - 1)}) {}` : placeholder(i - 1)}${str2}`)))) => {
  ast.rules.forEach(rule => rule.string = stringifier.stringify(rule));
  return {
    ast,
    css: stringifier.stringify(ast),
    placeholdersMetadata: findPlaceholdersAndPaths(ast)
  };
});

class OzStyle$1 extends HTMLStyleElement {
  constructor({
    templateId,
    css,
    values,
    ast,
    placeholdersMetadata,
    scoped
  }) {
    super();
    this.ast = ast;
    this.templateId = templateId;
    this.values = values;
    this.placeholdersMetadata = placeholdersMetadata;
    this.css = css;
    this.setAttribute('is', 'oz-style');
    this.scoped = scoped;
    this.scope = '';
  }

  get [OzStyle]() {
    return true;
  }

  set scope(scope) {
    this._scope = scope;
    this.update(...this.values);
  }

  get scope() {
    return this._scope;
  }

  clone(values = this.values) {
    return new OzStyle$1({
      ast: this.ast,
      css: this.css,
      values,
      placeholdersMetadata: this.placeholdersMetadata,
      templateId: this.templateId,
      scoped: this.scoped
    });
  }

  update(...values) {
    if (!this.placeholders) return void (this.values = values);
    this.placeholders.forEach(placeholder$$1 => (Array.isArray(placeholder$$1) ? placeholder$$1[0] : placeholder$$1)({
      values,
      forceUpdate: this.forceUpdate,
      scope: this.scope
    }));
    this.values = values;
  } // TODO @banou26: check if childRules array are necessary for the style templates


  connectedCallback(ast, childRules) {
    if (childRules) replace(childRules, ...replaceRules(ast, childRules, this.ast.rules));else if (this.innerHTML !== this.css) this.innerHTML = this.css;
    const {
      placeholders
    } = placeholdersMetadataToPlaceholders$1({
      element: this,
      placeholdersMetadata: this.placeholdersMetadata,
      childRules
    });
    this.childRules = childRules;
    this.placeholders = placeholders;
    this.forceUpdate = true;
    this.update(...this.values);
    this.forceUpdate = false;
    return childRules;
  }

  disconnectedCallback() {
    this.placeholders.filter(Array.isArray).forEach(([, unregister]) => unregister());
  }

}
customElements.get('oz-style') || customElements.define('oz-style', OzStyle$1, {
  extends: 'style'
});
var createStyle = (options => new OzStyle$1(options));

const styles = new Map();
const CSSTag = (transform = str => str) => {
  const tag = ({
    scoped
  }, strings, ...values) => {
    const templateId = 'css' + strings.reduce((str, str2, i) => str + placeholder(i - 1) + str2);
    if (styles.has(templateId)) return styles.get(templateId).clone(values);
    const {
      ast,
      css,
      placeholdersMetadata
    } = parse$1({
      transform,
      strings,
      values
    });
    styles.set(templateId, createStyle({
      templateId,
      css,
      values,
      ast,
      placeholdersMetadata,
      scoped
    }));
    return styles.get(templateId).clone(values);
  };

  const returnedTag = tag.bind(undefined, {});
  returnedTag.scoped = tag.bind(undefined, {
    scoped: true
  });
  return returnedTag;
};
const css = CSSTag();

const voidTags = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr'];
const regex = /^(\s*)(?:(\|)|(?:([.#\w--]*)(?:\(([\s\S]*?)\))?))(?: ?(.*))?/u;
const gRegex = new RegExp(regex, 'gmu');
const identifierRegex = /(?:(\.)|(#))([a-zA-Z0-9--]*)/u;
const gIdentifierRegex = new RegExp(identifierRegex, 'gu');
const classRegex = /class="(.*?)"/;

const makeHTML = ({
  tag,
  attributes,
  childs,
  textContent,
  id,
  classList,
  i,
  forceText,
  match
}) => {
  if (forceText) return (i ? '\n' : '') + match.input.trim();
  const childForceText = classList.includes('');
  const classStr = classList.join(' ');
  let attrStr = attributes ? ' ' + attributes : '';
  if (attrStr.match(classRegex)) attrStr = attrStr.replace(classRegex, (match, classes) => `class="${classes} ${classStr}"`);else if (classStr) attrStr += ` class="${classStr}"`;
  if (tag) return `<${tag}${id ? ` id="${id}"` : ''}${attrStr}>${textContent || ''}${childs.map((line, i) => makeHTML(_objectSpread({}, line, {
    forceText: childForceText,
    i
  }))).join('')}${voidTags.includes(tag) ? '' : `</${tag}>`}`;else return (i ? '\n' : '') + textContent;
};

const pushLine = ({
  childs: currentChilds
}, line) => {
  if (currentChilds.length && currentChilds[currentChilds.length - 1].indentation < line.indentation) pushLine(currentChilds[currentChilds.length - 1], line);else currentChilds.push(line);
};

const hierarchise = arr => {
  const hierarchisedArr = [];

  for (let line of arr) {
    if (hierarchisedArr.length && hierarchisedArr[hierarchisedArr.length - 1].indentation < line.indentation && hierarchisedArr[hierarchisedArr.length - 1].childs) pushLine(hierarchisedArr[hierarchisedArr.length - 1], line);else hierarchisedArr.push(line);
  }

  return hierarchisedArr;
};

const pozToHTML = str => hierarchise(str.match(gRegex).map(str => str.match(regex)).filter(match => match[0].trim().length).map((match, i) => {
  if (match[3] && !match[3].replace(placeholderRegex, '').trim().length) {
    return {
      indentation: match[1].split('\n').pop().length,
      textContent: match[3],
      classList: []
    };
  }

  const tag = match[3] ? match[3].match(/^([a-z0-9-]*)/)[1] : undefined;
  const identifiers = match[3] ? match[3].slice(tag.length).match(gIdentifierRegex) || [] : [];
  const id = identifiers.find(identifier => identifier.match(identifierRegex)[2]);
  const classList = identifiers.filter(identifier => identifier.match(identifierRegex)[1]).map(str => str.slice(1));
  return {
    indentation: match[1].split('\n').pop().length,
    tag: match[2] ? undefined : tag || 'div',
    attributes: match[4],
    id: id === null || id === void 0 ? void 0 : id.replace(/^#/, ''),
    classList,
    textContent: match[5],
    childs: [],
    match,
    i
  };
})).map(line => makeHTML(line)).join('');

const poz = HTMLTag(pozToHTML);

const strictWhitespaceRegex = /[^\S\r\n]*/;
const propertyNameRegex = /[a-zA-Z0-9-]*/;
const unnestedAtRule = ['@charset', '@import', '@namespace'];

const makeCSS = ({
  indent,
  str,
  childs
}, {
  selector: selectorPrefix = ''
} = {}) => {
  str = str.trim();
  const isAtRule = str.startsWith('@');

  if (unnestedAtRule.some(atRule => str.startsWith(atRule))) {
    return `${str};`;
  } else if (childs.length) {
    const selectorRulesets = matchSelectorRulesets(str);
    const selector = isAtRule ? str : selectorRulesets.length > 1 ? selectorRulesets.map(str => str.includes('&') // todo @banou26: make `any` and `matches` work on any browsers
    ? str.replace('&', `:-webkit-any(${selectorPrefix})`) : `${selectorPrefix ? `:-webkit-any(${selectorPrefix})` : selectorPrefix} ${str}`).join(',').trim() : selectorRulesets[0].includes('&') ? selectorRulesets[0].replace('&', `${selectorPrefix}`) : `${selectorPrefix ? `${selectorPrefix}` : selectorPrefix} ${selectorRulesets[0]}`;
    return `${selector}{${childs.filter(({
      childs
    }) => !childs.length || isAtRule).map(node => makeCSS(node)).join('')}}${isAtRule ? '' : childs.filter(({
      childs
    }) => childs.length).map(node => makeCSS(node, {
      selector
    })).join('')}`;
  } else if (isAtRule) {
    return str;
  } else {
    const propertyName = str.match(propertyNameRegex)[0];
    const rest = str.slice(propertyName.length + 1).trim();
    const propertyValue = rest.startsWith(':') ? rest.slice(1) : rest;
    return `${propertyName}:${propertyValue.trim()};`;
  }
};

const hierarchise$1 = (childs, item, lastChild = childs === null || childs === void 0 ? void 0 : childs[(childs === null || childs === void 0 ? void 0 : childs.length) - 1]) => (lastChild === null || lastChild === void 0 ? void 0 : lastChild.multiline) || item.indent > (lastChild === null || lastChild === void 0 ? void 0 : lastChild.indent) || 0 ? hierarchise$1(lastChild.childs, item) : childs.push(item);

const sozToCSS = str => str.split('\n').filter(str => str.trim().length).map(_str => {
  const indent = _str.match(strictWhitespaceRegex)[0].length;

  const str = _str.slice(indent);

  return {
    indent,
    str,
    childs: []
  };
}).reduce((arr, item) => (hierarchise$1(arr, item), arr), []).map(item => makeCSS(item)).join('');

const soz = CSSTag(sozToCSS);

const globalRemovedIds$1 = [];
const globalIds$1 = [];

const makeUniqueId$1 = (n = globalRemovedIds$1.length ? globalRemovedIds$1.shift() : globalIds$1[globalIds$1.length - 1] === undefined ? 0 : globalIds$1.length) => {
  globalIds$1.splice(n, 0, n);
  return {
    id: n,
    unregister: _ => {
      globalRemovedIds$1.push(n);
      globalIds$1.splice(globalIds$1.indexOf(n), 1);
    }
  };
};

const arrayToObjectWithProperties = obj => (Array.isArray(obj) ? obj.reduce((obj, prop) => (obj[prop] = undefined, obj), {}) : obj) || {};

const registerElement = element => {
  const {
    name,
    mixins: elementMixins,
    shadowDom: elementShadowDom,
    state: _state,
    attrs: _attrs,
    events: _events,
    props: _props,
    watchers: elementWatchers = [],
    template: buildHTMLTemplate,
    style: buildCSSTemplate,
    beforeConnected,
    created,
    connected,
    disconnected
  } = element,
        rest = _objectWithoutProperties(element, ["name", "mixins", "shadowDom", "state", "attrs", "events", "props", "watchers", "template", "style", "beforeConnected", "created", "connected", "disconnected"]);

  let {
    extends: extend
  } = element;
  const mixins$$1 = mixins.concat(elementMixins || []);
  const extendsMixins = getMixinProp(mixins$$1, 'extends').flat();
  const eventsMixins = getMixinProp(mixins$$1, 'events').flat();
  const attrsMixins = getMixinProp(mixins$$1, 'attrs').flat();
  const propsMixins = getMixinProp(mixins$$1, 'props').flat();
  const states = getMixinProp(mixins$$1, 'state').flat();
  const watchers = elementWatchers.concat(getMixinProp(mixins$$1, 'watchers').flat());
  const shadowDom = 'shadowDom' in element ? elementShadowDom : getMixinProp(mixins$$1, 'shadowDom').pop();
  const createdMixins = getMixinProp(mixins$$1, 'created');
  const beforeConnectedMixins = getMixinProp(mixins$$1, 'beforeConnected');
  const connectedMixins = getMixinProp(mixins$$1, 'connected');
  const disconnectedMixins = getMixinProp(mixins$$1, 'disconnected');
  const templateMixins = getMixinProp(mixins$$1, 'template');
  const styleMixins = getMixinProp(mixins$$1, 'style');
  if (!extend) extend = extendsMixins[0];
  const Class = extend ? Object.getPrototypeOf(document.createElement(extend)).constructor : HTMLElement;

  class OzElement$$1 extends Class {
    // TODO: test if i need to make a helper function from the reactivity side to isolate the constructors
    // because they can register some dependencies in the parent templates dependencies
    constructor() {
      super();
      const shadowDomType = typeof shadowDom;
      const host = shadowDomType === 'string' ? this.attachShadow({
        mode: shadowDom
      }) : shadowDomType === 'boolean' ? this.attachShadow({
        mode: shadowDom ? 'open' : 'closed'
      }) : this;
      const context = this[OzElementContext] = reactify(_objectSpread({}, rest, {
        element: this,
        host,
        dataset: {},
        template: undefined,
        style: undefined,
        references: new Map(),

        get refs() {
          return this.references && Array.from(this.references).reduce((obj, [attr, val]) => (obj[attr] = val, obj), {}) || {};
        }

      }));
      /* FIX UNTIL BABEL FIX THE OBJECT REST POLYFILL */

      Object.defineProperties(context, Object.getOwnPropertyDescriptors({
        get refs() {
          return this.references && Array.from(this.references).reduce((obj, [attr, val]) => (obj[attr] = val, obj), {}) || {};
        }

      }));
      /* / FIX UNTIL BABEL FIX THE OBJECT REST POLYFILL / */
      // attributes shouldn't be appended to the element at construction time(isn't an expected behavior)
      // so think about doing it at connection time
      // // Attrs mixins & attrs
      // attrsMixins
      //   .concat([_attrs])
      //   .map(attrs =>
      //     typeof attrs === 'function'
      //       ? Object.entries(attrs(context))
      //       : Object.entries(attrs))
      //   .map(attrs =>
      //     arrayToObjectWithProperties(attrs))
      //   .map(attrs =>
      //     Object.entries(attrs))
      //   .forEach(([name, value]) =>
      //     this.setAttribute(name, value))

      const attrs = context.attrs = reactify({});
      let ignoreAttrsObserver = false;

      for (const _ref of this.attributes) {
        const {
          name,
          value
        } = _ref;
        attrs[name] = value;
      }

      const attributeObserver = context._attributeObserver = new MutationObserver(records => records.forEach(({
        attributeName
      }) => {
        if (!ignoreAttrsObserver && this.hasAttribute(attributeName)) {
          ignoreAttrsObserver = true;
          attrs[attributeName] = this.getAttribute(attributeName);
          ignoreAttrsObserver = false;
        }
      }));
      attributeObserver.observe(this, {
        attributes: true
      });
      attrs.$watch(({
        event: {
          property,
          value
        }
      }) => {
        this.setAttribute(property, value);
        attributeObserver.takeRecords();
      }); // Props mixins & props

      const setProps = [];

      const setProp = prop => {
        if (setProps.includes(prop)) return;
        setProps.push(prop);
        Object.defineProperty(this, prop, {
          enumerable: true,
          configurable: true,
          get: _ => context.props[prop],
          set: val => context.props[prop] = val
        });
      };

      const props = context.props = new Proxy(reactify({}), {
        get: (target, property, receiver) => {
          if (property in target) return Reflect.get(target, property, receiver);else {
            target[property] = this[property];
            setProp(property);
            return Reflect.get(target, property, receiver);
          }
        },

        defineProperty(target, property, desc) {
          setProp(property);
          return Reflect.defineProperty(target, property, desc);
        }

      });
      propsMixins.concat(_props || []).forEach(_props => Object.defineProperties(props, Object.getOwnPropertyDescriptors(arrayToObjectWithProperties(typeof _props === 'function' ? _props(context) : _props)))); // State mixins & state

      const state = context.state = reactify((typeof _state === 'function' ? _state.bind(context)(context) : _state) || {});
      states.forEach(stateMixin => Object.defineProperties(state, Object.getOwnPropertyDescriptors(stateMixin(context)))); // Watchers mixins & watchers

      for (const item of watchers) {
        if (Array.isArray(item)) watch$1(item[0].bind(context, context), item[1].bind(context, context));else watch$1(item.bind(context, context));
      } // Events mixins & events


      eventsMixins.concat(_events || []).map(events => typeof events === 'function' ? events(context) : events).map(events => Object.entries(events)).flat().forEach(([name, event]) => this.addEventListener(name, event)); // binding functions to the context

      Object.entries(rest).filter(([, value]) => typeof value === 'function').forEach(([k, v]) => void (context[k] = v.bind(context, context))); // Created mixins & created

      createdMixins.concat(created || []).forEach(created => created(context));
    }

    get [OzElement]() {
      return true;
    }

    static get name() {
      return name;
    }

    connectedCallback() {
      const {
        [OzElementContext]: context,
        [OzElementContext]: {
          host,
          _templateWatcher,
          _styleWatcher,
          references
        }
      } = this; // Connected mixins & connected

      beforeConnectedMixins.forEach(mixin$$1 => mixin$$1(context));
      if (beforeConnected) beforeConnected(context);
      let {
        style,
        template
      } = context; // CSS Template

      if (!_styleWatcher && (buildCSSTemplate || styleMixins.length)) {
        const _style = buildCSSTemplate || styleMixins[0]; // eslint-disable-next-line no-return-assign


        context._styleWatcher = watch$1(_ => style ? _style.call(context, context) : style = context.style = _style.call(context, context), ({
          newValue: updatedTemplate
        }) => {
          if (!updatedTemplate[OzStyle]) throw noOzStyleError;
          if (style.templateId !== updatedTemplate.templateId) throw ozStyleChangedError;
          style.update(...updatedTemplate.values);
        });
      }

      if (style) {
        if (style.scoped) {
          const uniqueId = makeUniqueId$1();
          style.scope = uniqueId.id;
          context.scope = uniqueId.id;
          context._scope = uniqueId;
          this.dataset.ozScope = uniqueId.id;
        }

        if (shadowDom) host.appendChild(style);else {
          const root = host.getRootNode();
          if (root === document) host.getRootNode({
            composed: true
          }).head.appendChild(style);else root.appendChild(style);
        }
      } // HTML Template


      if (!_templateWatcher && (buildHTMLTemplate || templateMixins.length)) {
        const _template = buildHTMLTemplate || templateMixins[0];

        template = context.template = _template.call(context, context);
        template.references = references;
        host.appendChild(template.content);
        context._templateWatcher = watch$1(_ => _template.call(context, context), ({
          newValue: updatedTemplate
        }) => {
          if (!updatedTemplate[OzHTMLTemplate]) throw noHTMLTemplateError;
          if (template.templateId !== updatedTemplate.templateId) throw htmlTemplateChangedError;
          template.update(...updatedTemplate.values);
        });
      } else if (template) host.appendChild(template.content); // Connected mixins & connected


      connectedMixins.forEach(mixin$$1 => mixin$$1(context));
      if (connected) connected(context);
    }

    disconnectedCallback() {
      const {
        [OzElementContext]: context,
        [OzElementContext]: {
          style
        }
      } = this;
      if (style && !shadowDom) style.remove();

      if (context.scope) {
        style.scope = '';

        context._scope.unregister();

        context.scope = undefined;
        context._scope = undefined;
        this.dataset.ozScope = undefined;
      } // Disconnected mixins & disconnected


      disconnectedMixins.forEach(mixin$$1 => mixin$$1(context));
      if (disconnected) disconnected(context);
    }

  }

  window.customElements.define(name, OzElement$$1, _objectSpread({}, extend ? {
    extends: extend
  } : undefined));
  return OzElement$$1;
};

const RouterView = Symbol.for('RouterView');

const getClosestRouterView = (node, closestOzElementParent = getClosestOzElementParent(node), isRouter = closestOzElementParent && RouterView in closestOzElementParent) => isRouter ? closestOzElementParent : closestOzElementParent && getClosestRouterView(closestOzElementParent); // TODO(reactivity optimisation): find why there's 3 first renders instead of just 1, it has to do with the reactivity & the dependency chain:
// matches -> route -> content, maybe calling the template everytime, it should only be called 1 time at the first render


const RouterViewMixin = {
  props: ctx => ({
    [RouterView]: true,

    get route() {
      return ctx.state.route;
    },

    get childPathname() {
      return ctx.state.childPathname;
    }

  }),
  state: ctx => ({
    get url() {
      var _getClosestRouterView, _ctx$router;

      return ((_getClosestRouterView = getClosestRouterView(ctx.element)) === null || _getClosestRouterView === void 0 ? void 0 : _getClosestRouterView.childPathname) || ((_ctx$router = ctx.router) === null || _ctx$router === void 0 ? void 0 : _ctx$router.url);
    },

    get pathname() {
      var _this$url;

      return (_this$url = this.url) === null || _this$url === void 0 ? void 0 : _this$url.pathname;
    },

    get matches() {
      var _ctx$router2;

      return this.url && ((_ctx$router2 = ctx.router) === null || _ctx$router2 === void 0 ? void 0 : _ctx$router2.matchRoutes(this.url));
    },

    get route() {
      var _this$matches;

      return (_this$matches = this.matches) === null || _this$matches === void 0 ? void 0 : _this$matches[0];
    },

    get content() {
      var _this$route;

      const content = (_this$route = this.route) === null || _this$route === void 0 ? void 0 : _this$route.content;
      return typeof content === 'function' ? content().then(module => module.default) : content;
    },

    get childPathname() {
      var _this$pathname, _this$pathname$replac, _this$route2;

      return (_this$pathname = this.pathname) === null || _this$pathname === void 0 ? void 0 : (_this$pathname$replac = _this$pathname.replace) === null || _this$pathname$replac === void 0 ? void 0 : _this$pathname$replac.call(_this$pathname, (_this$route2 = this.route) === null || _this$route2 === void 0 ? void 0 : _this$route2.regex, '');
    }

  }),
  template: ({
    state: {
      content
    }
  }) => html`${content}`
};
var registerRouterView = (_ => customElements.get('router-view') || registerElement({
  name: 'router-view',
  mixins: [RouterViewMixin]
}));

const RouterLinkMixin = {
  extends: 'a',
  created: (ctx, {
    element,
    attrs
  } = ctx) => element.addEventListener('click', ev => ctx.router.push(attrs.to))
};
var registerRouterLink = (_ => customElements.get('router-link') || registerElement({
  name: 'router-link',
  mixins: [RouterLinkMixin]
}));

const routerGlobalMixin = {
  beforeConnected: (ctx, closestOzElementParent = getClosestOzElementParent(ctx.element)) => ctx.router = closestOzElementParent && closestOzElementParent[OzElementContext].router
};
const registerRouterMixins = _ => mixins.includes(routerGlobalMixin) || mixin(routerGlobalMixin);
const registerCustomElements = _ => {
  registerRouterView();
  registerRouterLink();
};
const compileRoutes = ({
  routes = []
} = {}) => routes.map(route => Array.isArray(route.path) ? route.path.map(path => _objectSpread({}, route, {
  regex: pathToRegexp(path, [], {
    end: false
  }),
  resolve: ((toPath, params) => toPath(params)).bind(undefined, compile(path))
})) : _objectSpread({}, route, {
  regex: pathToRegexp(route.path, [], {
    end: false
  }),
  resolve: ((toPath, params) => toPath(params)).bind(undefined, compile(route.path))
})).flat(Infinity);
const matchRoutes = routes => url => routes.filter(({
  regex
}) => regex.test(url.pathname));

const history = window.history;
const Router = ({
  routes: _routes,
  base: _base = '',
  linkActiveClass = 'linkActiveClass',
  linkExactActiveClass = 'linkExactActiveClass',
  base = new URL(_base, window.location.origin),
  _: routes = compileRoutes({
    routes: _routes
  }),
  matchRoutes: matchRoutes$$1 = matchRoutes(routes)
} = {}) => {
  registerRouterMixins();
  registerCustomElements();

  let _state;

  const go = (replace = false) => location => isNaN(location) ? (replace ? history.replaceState : history.pushState).call(history, {}, '', _state._url = resolve(location)) : undefined; // history.go(Number(location))


  const push = go();

  const resolve = (location, url = typeof location === 'string' || location instanceof URL || location instanceof window.Location ? new URL(location, window.location) : new URL(`${(location.route || routes.find(({
    name
  }) => name === location.route.name)).resolve(location.params)}${new URLSearchParams(location.query).toString()}#${location.hash}`, window.location)) => url.pathname.startsWith(base.pathname) ? url : new URL(url.pathname, base);

  const state = reactify({
    routes,
    matchRoutes: matchRoutes$$1,
    _url: new URL(window.location),

    set url(url) {
      return push(this._url = resolve(url)) && url;
    },

    get url() {
      return this._url;
    },

    resolve,
    push,
    replace: go(true)
  });
  _state = state;

  window.onpopstate = ev => state.replace(window.location);

  return state;
};

const storeGlobalMixin = {
  beforeConnected: (ctx, closestOzElementParent = getClosestOzElementParent(ctx.element)) => ctx.store = closestOzElementParent && closestOzElementParent[OzElementContext].store
};
const registerStoreMixins = _ => mixins.includes(storeGlobalMixin) || mixin(storeGlobalMixin);

export { poz, soz, OzHTMLTemplate, HTMLTag, html, OzStyle, CSSTag, css, OzElementContext, OzElement, mixin, registerElement, watch$1 as watch, getReactivityRoot, setReactivityRoot, reactify as r, reactify as react, reactivity, reactivityProperties, registerRouterMixins, Router, RouterViewMixin, registerStoreMixins };
